import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { getTableColumns } from 'drizzle-orm'
import { describe, expect, it } from 'vitest'
import { bouts, boxers } from '../schema'
import {
  BOUT_COLUMNS,
  BOXER_COLUMNS,
  buildImportStatements,
  buildOpponentIndex,
  buildUpserts,
  checkOutDir,
  checkPrune,
  D1_MAX_STATEMENT_BYTES,
  DIVISIONS,
  directoryIndexOrder,
  GENERATED_SQL_FILE,
  nameList,
  packFiles,
  parseFlags,
  planImport,
  prepareDataset,
  resolveTarget,
  type SourceBoxer,
  SourceValidationError,
  sqlLiteral,
  TARGET_FLAGS,
  TARGETS,
  toBoxerRow,
  validateSource
} from '.'
import { opponentPair, sourceBout, sourceBoxer } from './test-records'

const FIXTURE = resolve(import.meta.dirname, '../../../../d1/fixtures/boxers.sample.json')
const byteLength = (text: string) => new TextEncoder().encode(text).length

function validationErrors(input: unknown): string[] {
  try {
    validateSource(input)
  } catch (error) {
    if (error instanceof SourceValidationError) return error.errors
    throw error
  }
  return []
}

describe('validateSource', () => {
  it('accepts a well-formed source', () => {
    expect(validationErrors(opponentPair())).toEqual([])
  })

  it('rejects duplicate ids, BoxRec ids and slugs', () => {
    const [ana] = opponentPair()
    const errors = validationErrors([ana, { ...ana }])
    expect(errors).toHaveLength(3)
    expect(errors.join('\n')).toMatch(
      /duplicate `id`.*\n.*duplicate `boxrecId`.*\n.*duplicate `slug`/
    )
  })

  it.each(['boxers.json', 'Ana-Alpha', 'ana_alpha', 'ana--alpha', '-ana', ''])(
    'rejects the slug %j',
    slug => {
      expect(validationErrors([sourceBoxer(1, 'Ana', { slug })]).join('\n')).toMatch(/slug/)
    }
  )

  it('rejects unknown and missing fields, bad value sets and foreign bouts', () => {
    const boxer = sourceBoxer(1, 'Ana', { stance: 'sideways', proWins: -1 })
    const { gym: _gym, ...withoutGym } = boxer
    const errors = validationErrors([
      {
        ...withoutGym,
        nickname: 'x',
        bouts: [sourceBout({ boxrecId: '7' }, '1', 'Bea', { result: 'won' })]
      }
    ])
    expect(errors).toEqual(
      expect.arrayContaining([
        expect.stringMatching(/unknown field `nickname`/),
        expect.stringMatching(/missing field `gym`/),
        expect.stringMatching(/`stance` must be one of/),
        expect.stringMatching(/`proWins` must be a non-negative integer/),
        expect.stringMatching(/bout 0: `result` must be one of/),
        expect.stringMatching(/bout 0: `boxerId` "7" is not the boxer's/)
      ])
    )
  })
})

describe('mapping and normalization', () => {
  it('covers every column of the schema except the database-assigned ones', () => {
    const names = (table: typeof boxers | typeof bouts) =>
      Object.values(getTableColumns(table)).map(column => column.name)
    expect([...BOXER_COLUMNS].sort()).toEqual(
      names(boxers)
        .filter(n => n !== 'imported_at')
        .sort()
    )
    expect([...BOUT_COLUMNS].sort()).toEqual(
      names(bouts)
        .filter(n => n !== 'id')
        .sort()
    )
  })

  it('writes empty strings as NULL and copies free text verbatim', () => {
    const row = toBoxerRow(
      sourceBoxer(1, 'Ana', {
        proDivision: '',
        proStatus: '',
        proDebutDate: '',
        residence: '',
        dateOfBirth: 'child in the hospital',
        nicknames: '"The Hammer"'
      })
    )
    expect(row).toMatchObject({
      pro_division: null,
      pro_status: null,
      pro_debut_date: null,
      residence: null,
      date_of_birth: 'child in the hospital',
      nicknames: '"The Hammer"'
    })
    expect(Object.keys(row)).not.toContain('amateur_wins')
  })

  it('splits staff names on newlines into JSON arrays', () => {
    expect(nameList(null)).toBe('[]')
    expect(nameList('')).toBe('[]')
    expect(nameList('Ron Dove\nBob Kane')).toBe('["Ron Dove","Bob Kane"]')
    expect(nameList(' Ron Dove \r\n\n')).toBe('["Ron Dove"]')
  })

  it('maps bouts in source order with their ordinal, boolean and resolved opponent', () => {
    const dataset = prepareDataset(opponentPair())
    expect(
      dataset.bouts.map(b => [
        b.boxer_id,
        b.ordinal,
        b.opponent_boxer_id,
        b.event_name,
        b.title_fight
      ])
    ).toEqual([
      [1, 0, 2, 'Granby Halls, Leicester', 0],
      [1, 1, null, null, 1],
      [2, 0, 1, 'Granby Halls, Leicester', 0]
    ])
    expect(dataset.quirks).toMatchObject({ opponentLinks: 2, doubledBouts: 1, selfLinks: 0 })
  })

  it('drops the junk `world` record on purpose and reports it', () => {
    const world = sourceBoxer(9, 'World', { slug: 'world', nationality: 'Usyk', bouts: null })
    const dataset = prepareDataset([...opponentPair(), world])
    expect(dataset.boxers.map(row => row.slug)).toEqual(['ana-o-brien-jr', 'bea-brown'])
    expect(dataset.dropped).toEqual([
      expect.objectContaining({ slug: 'world', boxrecId: '90', bouts: 0 })
    ])
    expect(dataset.sourceCounts).toEqual({ boxers: 3, bouts: 3 })
  })
})

describe('opponent matching (as apps/web/lib/opponent-mapper.ts)', () => {
  const candidate = (
    slug: string,
    name: string,
    proTotalBouts: number,
    birthName: string | null = null
  ) => ({
    slug,
    name,
    birthName,
    proTotalBouts,
    proWins: 0
  })

  it('matches exact names, normalized names, suffixes and birth names', () => {
    const index = buildOpponentIndex([
      candidate('floyd-jr', 'Floyd Mayweather Jr', 50),
      candidate('cassius', 'Muhammad Ali', 60, 'Cassius Clay')
    ])
    expect(index.lookup('Floyd Mayweather Jr')).toBe('floyd-jr')
    expect(index.lookup('  floyd   MAYWEATHER ')).toBe('floyd-jr')
    expect(index.lookup('Cassius Clay')).toBe('cassius')
    expect(index.lookup('Nobody')).toBeUndefined()
  })

  it('lets the later boxer in index order win a contested name', () => {
    const order = directoryIndexOrder([
      candidate('floyd-sr', 'Floyd Mayweather Sr', 35),
      candidate('floyd-jr', 'Floyd Mayweather Jr', 50)
    ])
    expect(order.map(c => c.slug)).toEqual(['floyd-jr', 'floyd-sr'])
    const index = buildOpponentIndex(order)
    expect(index.lookup('Floyd Mayweather')).toBe('floyd-sr')
    expect(index.collisions).toBeGreaterThan(0)
  })
})

describe('SQL batching', () => {
  it('escapes literals', () => {
    expect(sqlLiteral(null)).toBe('NULL')
    expect(sqlLiteral(42)).toBe('42')
    expect(sqlLiteral("O'Brien; -- \n é")).toBe("'O''Brien; -- \n é'")
    expect(() => sqlLiteral(1.5)).toThrow(/integers/)
  })

  it('keeps every statement under the byte limit and every row exactly once', () => {
    const rows = Array.from({ length: 200 }, (_, id) => ({ id, name: `é${'x'.repeat(500)}` }))
    const statements = buildUpserts(
      { table: 't', columns: ['id', 'name'], conflict: ['id'] },
      rows,
      5_000
    )
    expect(statements.length).toBeGreaterThan(20)
    for (const statement of statements) expect(byteLength(statement)).toBeLessThanOrEqual(5_000)
    const ids = statements.flatMap(s => [...s.matchAll(/^\((\d+),/gm)].map(m => Number(m[1])))
    expect(ids).toEqual(rows.map(row => row.id))
  })

  it('refuses a row that cannot fit in one statement', () => {
    const rows = [{ id: 1, name: 'x'.repeat(6_000) }]
    expect(() =>
      buildUpserts({ table: 't', columns: ['id', 'name'], conflict: ['id'] }, rows, 5_000)
    ).toThrow(/over the 5000-byte statement limit/)
  })

  it('only rewrites rows that changed, and never with INSERT OR REPLACE', () => {
    const [statement] = buildUpserts(
      {
        table: 't',
        columns: ['id', 'a', 'b'],
        conflict: ['id'],
        touch: 'imported_at = CURRENT_TIMESTAMP'
      },
      [{ id: 1, a: 'x', b: null }]
    )
    expect(statement).toBe(
      "INSERT INTO t (id, a, b) VALUES\n(1, 'x', NULL)\n" +
        'ON CONFLICT (id) DO UPDATE SET a = excluded.a, b = excluded.b, imported_at = CURRENT_TIMESTAMP\n' +
        'WHERE t.a IS NOT excluded.a OR t.b IS NOT excluded.b;\n'
    )
  })

  it('leaves matching rows out of the INSERT for an AUTOINCREMENT table', () => {
    const [statement] = buildUpserts(
      { table: 't', columns: ['k', 'a', 'b'], conflict: ['k'], keep: ['b'], skipUnchanged: true },
      [{ k: 1, a: 'x', b: null }]
    )
    expect(statement).toBe(
      "WITH incoming (k, a, b) AS (VALUES\n(1, 'x', NULL))\n" +
        'INSERT INTO t (k, a, b)\n' +
        'SELECT * FROM incoming WHERE NOT EXISTS (SELECT 1 FROM t AS stored WHERE ' +
        'stored.k = incoming.k AND stored.a IS incoming.a)\n' +
        'ON CONFLICT (k) DO UPDATE SET a = excluded.a\n' +
        'WHERE t.a IS NOT excluded.a;\n'
    )
  })

  it('packs statements into files under the size limit, in order', () => {
    const statements = Array.from({ length: 50 }, (_, i) => `SELECT ${i};${' '.repeat(90)}\n`)
    const files = packFiles(statements, 1_000)
    expect(files.length).toBeGreaterThan(5)
    expect(files.map(f => f.name).slice(0, 2)).toEqual(['0001.sql', '0002.sql'])
    for (const file of files) expect(file.bytes).toBeLessThanOrEqual(1_000 + 200)
    expect(files.flatMap(f => f.sql.split('\n').filter(l => l.startsWith('SELECT')))).toHaveLength(
      50
    )
  })

  it('emits identical SQL for the same source, within D1 limits', () => {
    const source = JSON.parse(readFileSync(FIXTURE, 'utf8'))
    const first = buildImportStatements(prepareDataset(source))
    const second = buildImportStatements(prepareDataset(structuredClone(source)))
    expect(second).toEqual(first)
    expect(Math.max(...first.map(byteLength))).toBeLessThan(D1_MAX_STATEMENT_BYTES)
    // Divisions and boxers come before any bout, and opponent links come last.
    const firstBout = first.findIndex(s => s.includes('\nINSERT INTO bouts'))
    expect(firstBout).toBeGreaterThan(0)
    expect(first.slice(firstBout).some(s => s.startsWith('INSERT INTO boxers'))).toBe(false)
    expect(first.at(-1)).toMatch(/^UPDATE bouts SET opponent_boxer_id/)
  })
})

describe('identity and targets', () => {
  it('flags an id or BoxRec id that the source pairs differently', () => {
    const boxers = prepareDataset(opponentPair()).boxers
    const row = (id: number, boxrec_id: string, slug = `boxer-${id}`) => ({ id, boxrec_id, slug })
    expect(planImport([row(1, '10', 'ana-o-brien-jr')], boxers)).toEqual({
      conflicts: [],
      stale: []
    })
    expect(planImport([row(1, '99', 'ana-o-brien-jr')], boxers).conflicts).toEqual([
      'id 1 is boxrec_id 99 in D1 but 10 in the source'
    ])
    expect(planImport([row(5, '20')], boxers)).toEqual({
      conflicts: ['boxrec_id 20 is id 5 in D1 but 2 in the source'],
      stale: [row(5, '20')]
    })
  })

  it('refuses a slug that moves to another boxer, but allows a rename or a freed slug', () => {
    const [ana, bea] = opponentPair() as [SourceBoxer, SourceBoxer]
    const swapped = prepareDataset([
      { ...ana, slug: 'bea-brown' },
      { ...bea, slug: 'ana-o-brien-jr' }
    ]).boxers
    const existing = [
      { id: 1, boxrec_id: '10', slug: 'ana-o-brien-jr' },
      { id: 2, boxrec_id: '20', slug: 'bea-brown' }
    ]
    expect(planImport(existing, swapped).conflicts).toEqual([
      'slug ana-o-brien-jr moves from id 1 (now bea-brown) to id 2',
      'slug bea-brown moves from id 2 (now ana-o-brien-jr) to id 1'
    ])
    const renamed = prepareDataset([{ ...ana, slug: 'ana-obrien' }, bea]).boxers
    expect(planImport(existing, renamed).conflicts).toEqual([])
    // Bea leaves the source, and a new boxer takes her slug: the prune frees it first.
    const replaced = prepareDataset([ana, { ...bea, id: 3, boxrecId: '30', bouts: [] }]).boxers
    expect(planImport(existing, replaced)).toEqual({ conflicts: [], stale: [existing[1]] })
  })

  it('caps a remote prune unless --allow-prune covers it', () => {
    const stale = Array.from({ length: 60 }, (_, i) => ({
      id: i + 1,
      boxrec_id: String(i),
      slug: `b-${i}`
    }))
    expect(() => checkPrune('local', 100, stale)).not.toThrow()
    expect(() => checkPrune('staging', 5_570, stale.slice(0, 50))).not.toThrow()
    expect(() => checkPrune('staging', 5_570, stale)).toThrow(
      /Refusing to prune 60 of 5570 boxers from staging \(the limit is 50\)[\s\S]*--allow-prune 60[\s\S]*b-0 \(id 1\)/
    )
    expect(() => checkPrune('staging', 300, stale.slice(0, 4))).toThrow(/the limit is 3/)
    expect(() => checkPrune('staging', 5_570, stale, 60)).not.toThrow()
    expect(() => checkPrune('staging', 5_570, [])).not.toThrow()
  })

  it('prunes nothing from production without --allow-prune', () => {
    const stale = [{ id: 7, boxrec_id: '70', slug: 'gone' }]
    expect(() => checkPrune('production', 5_570, stale)).toThrow(
      /Refusing to prune 1 of 5570 boxers from production \(the limit is 0\)[\s\S]*--allow-prune 1[\s\S]*gone \(id 7\)/
    )
    expect(() => checkPrune('production', 5_570, stale, 0)).toThrow(/the limit is 0/)
    expect(() => checkPrune('production', 5_570, stale, 1)).not.toThrow()
    expect(() => checkPrune('production', 0, [])).not.toThrow()
  })

  it('only ever cleans its own SQL files, and never next to the migrations', () => {
    expect(['0001.sql', '0013.sql', '0000-prune.sql'].every(n => GENERATED_SQL_FILE.test(n))).toBe(
      true
    )
    expect(
      ['0000_boxing_schema.sql', 'seed.sql', '0001.sql.bak'].some(n => GENERATED_SQL_FILE.test(n))
    ).toBe(false)
    const root = '/repo'
    expect(() => checkOutDir('/repo/d1/.import/staging', root)).not.toThrow()
    for (const dir of ['/repo/d1/drizzle', '/repo/d1/drizzle/meta', '/repo/d1', '/repo']) {
      expect(() => checkOutDir(dir, root)).toThrow(/d1\/drizzle/)
    }
  })

  it('parses flags after a bare `--`', () => {
    expect(
      parseFlags(
        ['--', '--target', 'local', '--dry-run', '--seed=3'],
        ['target', 'dry-run', 'seed']
      )
    ).toEqual({
      target: 'local',
      'dry-run': true,
      seed: '3'
    })
    expect(() => parseFlags(['--env', 'production'], ['target'])).toThrow(/Unknown argument/)
  })
})

// Target resolution only: nothing here runs Wrangler.
describe('resolveTarget', () => {
  // The flags `db:import` accepts (scripts/d1/import-boxers.ts).
  const IMPORT_FLAGS = [...TARGET_FLAGS, 'source', 'out-dir', 'allow-prune', 'dry-run']
  const resolveArgs = (...argv: string[]) => resolveTarget(parseFlags(argv, IMPORT_FLAGS))
  const production = {
    name: 'production',
    database: 'boxingundefeated-com-production',
    flags: ['--remote', '--env', 'production']
  }

  it('requires an explicit, known target and keeps local and staging as they were', () => {
    expect(resolveArgs('--target', 'local')).toEqual({
      name: 'local',
      database: 'boxingundefeated-com-local',
      flags: ['--local']
    })
    expect(resolveArgs('--', '--target', 'staging', '--source', 'boxers.json')).toEqual({
      name: 'staging',
      database: 'boxingundefeated-com-staging',
      flags: ['--remote', '--env', 'staging']
    })
    expect(() => resolveArgs()).toThrow(/Missing --target/)
    expect(() => resolveArgs('--target')).toThrow(/Missing --target/)
    for (const name of ['prod', 'Production', 'production ', 'constructor', '__proto__']) {
      expect(() => resolveArgs('--target', name)).toThrow(/Unknown --target/)
    }
  })

  it('refuses production without --confirm-production', () => {
    for (const argv of [
      ['--target', 'production'],
      ['--target=production', '--dry-run'],
      ['--target', 'production', '--allow-prune', '3']
    ]) {
      expect(() => resolveArgs(...argv)).toThrow(
        /Refusing --target production without --confirm-production/
      )
    }
  })

  it('resolves production with --confirm-production, before or after the target', () => {
    expect(resolveArgs('--target', 'production', '--confirm-production')).toEqual(production)
    expect(resolveArgs('--', '--confirm-production', '--target=production')).toEqual(production)
    expect(
      resolveArgs('--target', 'production', '--confirm-production', '--source', 'boxers.json')
    ).toEqual(production)
  })

  it('refuses a misspelt, valued or misplaced confirmation', () => {
    for (const typo of [
      '--confirm-prod',
      '--confirm_production',
      '--confirmProduction',
      '--Confirm-production',
      '--confirm',
      '--production',
      '--yes'
    ]) {
      expect(() => resolveArgs('--target', 'production', typo)).toThrow(/Unknown argument/)
    }
    expect(() => resolveArgs('--target', 'production', '--confirm-production=yes')).toThrow(
      /takes no value/
    )
    expect(() =>
      resolveArgs('--confirm-production', 'production', '--target', 'production')
    ).toThrow(/takes no value/)
    for (const name of ['local', 'staging']) {
      expect(() => resolveArgs('--target', name, '--confirm-production')).toThrow(
        /only goes with --target production/
      )
    }
  })

  it("reaches the databases of wrangler.jsonc, with the db:migrate scripts' flags", () => {
    const root = resolve(import.meta.dirname, '../../../..')
    const { scripts } = JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf8'))
    const source = readFileSync(resolve(root, 'apps/web/wrangler.jsonc'), 'utf8')
    const wrangler = JSON.parse(source.replace(/^\s*\/\/.*$/gm, ''))
    for (const target of Object.values(TARGETS)) {
      expect(scripts[`db:migrate:${target.name}`]).toBe(
        `pnpm --filter web exec wrangler d1 migrations apply ${target.database} ${target.flags.join(' ')}`
      )
      const config = target.name === 'local' ? wrangler : wrangler.env[target.name]
      expect(config.d1_databases[0].database_name).toBe(target.database)
    }
  })
})

describe('the committed fixture (d1/fixtures/boxers.sample.json)', () => {
  const source = JSON.parse(readFileSync(FIXTURE, 'utf8')) as ReturnType<typeof sourceBoxer>[]
  const dataset = prepareDataset(source)

  it('covers every division, mutual opponents and the edge cases', () => {
    expect(source.length).toBeGreaterThanOrEqual(45)
    expect(source.length).toBeLessThanOrEqual(60)
    const divisions = new Set(dataset.boxers.map(row => row.pro_division))
    expect(DIVISIONS.every(d => divisions.has(d.proDivision))).toBe(true)
    const links = new Set(dataset.bouts.map(b => `${b.boxer_id}>${b.opponent_boxer_id}`))
    const mutual = dataset.bouts.filter(
      b =>
        b.opponent_boxer_id !== null &&
        b.opponent_boxer_id !== b.boxer_id &&
        links.has(`${b.opponent_boxer_id}>${b.boxer_id}`)
    )
    expect(mutual.length).toBeGreaterThanOrEqual(2)
    expect(source.some(r => r.bouts === null && r.slug !== 'world')).toBe(true)
    expect(source.some(r => r.bouts?.length === 100)).toBe(true)
    expect(dataset.dropped.map(d => d.slug)).toEqual(['world'])
    for (const field of [
      'proDivision',
      'proStatus',
      'proDebutDate',
      'residence',
      'bouts.eventName'
    ]) {
      expect(dataset.quirks.emptyStringsToNull[field]).toBeGreaterThan(0)
    }
  })
})
