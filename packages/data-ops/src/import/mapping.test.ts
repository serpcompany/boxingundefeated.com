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
  D1_MAX_STATEMENT_BYTES,
  DIVISIONS,
  directoryIndexOrder,
  findIdentityConflicts,
  nameList,
  PRODUCTION_REFUSAL,
  packFiles,
  parseFlags,
  prepareDataset,
  resolveTarget,
  SourceValidationError,
  sqlLiteral,
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
    expect(findIdentityConflicts([{ id: 1, boxrec_id: '10' }], boxers)).toEqual([])
    expect(findIdentityConflicts([{ id: 1, boxrec_id: '99' }], boxers)).toEqual([
      'id 1 is boxrec_id 99 in D1 but 10 in the source'
    ])
    expect(findIdentityConflicts([{ id: 5, boxrec_id: '20' }], boxers)).toEqual([
      'boxrec_id 20 is id 5 in D1 but 2 in the source'
    ])
  })

  it('requires an explicit target and refuses production', () => {
    expect(resolveTarget('local').flags).toEqual(['--local'])
    expect(resolveTarget('staging').flags).toEqual(['--remote', '--env', 'staging'])
    expect(() => resolveTarget(undefined)).toThrow(/Missing --target/)
    expect(() => resolveTarget('production')).toThrow(PRODUCTION_REFUSAL)
    expect(() => resolveTarget('prod')).toThrow(/Unknown --target/)
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
