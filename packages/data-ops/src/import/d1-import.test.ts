import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { compareBoxerRecord } from '../parity/rules'
import { getBoxerProfile } from '../queries'
import { createTestDatabase, type TestDatabase } from '../test-support'
import {
  BOUT_COLUMNS,
  BOXER_COLUMNS,
  buildImportStatements,
  buildOpponentLinks,
  buildPrune,
  buildTrims,
  expectedChecksums,
  type ImportDataset,
  prepareDataset,
  type Row,
  rowsChecksum,
  type SourceBoxer
} from '.'
import { opponentPair, sourceBout, sourceBoxer } from './test-records'

const FIXTURE = resolve(import.meta.dirname, '../../../../d1/fixtures/boxers.sample.json')

let test: TestDatabase
beforeEach(async () => {
  test = await createTestDatabase()
})
afterEach(async () => {
  await test.dispose()
})

/**
 * Runs an import the way one `--file` does, every statement in a single batch, and returns the
 * number of rows the statements inserted, updated or deleted.
 */
async function runImport(dataset: ImportDataset): Promise<number> {
  const results = await test.binding.batch(
    buildImportStatements(dataset).map(statement => test.binding.prepare(statement))
  )
  return results.reduce((total, result) => total + (result.meta.changes ?? 0), 0)
}

async function all(sql: string): Promise<Row[]> {
  return (await test.binding.prepare(sql).all<Row>()).results
}

const LONG_AGO = '2000-01-01 00:00:00'

/** Backdates every `imported_at`, runs `work`, and returns the ids of the boxers it touched. */
async function touchedBy(work: () => Promise<unknown>): Promise<number[]> {
  await test.binding.prepare(`UPDATE boxers SET imported_at = '${LONG_AGO}'`).run()
  await work()
  const rows = await all(`SELECT id FROM boxers WHERE imported_at <> '${LONG_AGO}' ORDER BY id`)
  return rows.map(row => row.id as number)
}

/** The parity rules' verdict on every record, with opponents resolved by `names`. */
async function parityMismatches(records: SourceBoxer[], names: Record<string, number>) {
  const boxers = await all('SELECT * FROM boxers')
  const bouts = await all('SELECT * FROM bouts')
  return records.flatMap(record => {
    const boxer = boxers.find(row => row.slug === record.slug)
    const own = bouts.filter(bout => bout.boxer_id === boxer?.id)
    return compareBoxerRecord(record, boxer, own, name => names[name] ?? null).mismatches
  })
}

/**
 * Every column, including ids and `imported_at`, plus `sqlite_sequence`: the bouts' AUTOINCREMENT
 * counter, which an INSERT advances (and D1 counts as a written row) even for a no-op upsert.
 */
async function stateChecksum(): Promise<string> {
  return [
    JSON.stringify(await all('SELECT name, seq FROM sqlite_sequence ORDER BY name')),
    rowsChecksum([...BOXER_COLUMNS, 'imported_at'], await all('SELECT * FROM boxers ORDER BY id')),
    rowsChecksum(
      ['id', ...BOUT_COLUMNS],
      await all('SELECT * FROM bouts ORDER BY boxer_id, ordinal')
    )
  ].join()
}

describe('importing into D1', () => {
  it('loads the fixture so it matches the source, and a re-run writes nothing', async () => {
    const dataset = prepareDataset(JSON.parse(readFileSync(FIXTURE, 'utf8')))
    expect(await runImport(dataset)).toBeGreaterThan(0)
    const expected = expectedChecksums(dataset)
    expect(rowsChecksum(BOXER_COLUMNS, await all('SELECT * FROM boxers ORDER BY id'))).toBe(
      expected.boxers
    )
    expect(
      rowsChecksum(BOUT_COLUMNS, await all('SELECT * FROM bouts ORDER BY boxer_id, ordinal'))
    ).toBe(expected.bouts)
    const opponents = Object.fromEntries(
      dataset.bouts.map(bout => [bout.opponent_name, bout.opponent_boxer_id as number])
    )
    expect(await parityMismatches(dataset.records, opponents)).toEqual([])
    const before = await stateChecksum()

    expect(await runImport(dataset)).toBe(0)
    expect(await stateChecksum()).toBe(before)
  })

  it('serves the imported rows through the app queries', async () => {
    await runImport(prepareDataset(opponentPair()))
    const profile = await getBoxerProfile(test.db, 'bea-brown')
    expect(profile?.boxer.managers).toEqual(['Ron Dove', 'Bob Kane'])
    expect(profile?.bouts.map(bout => bout.opponentSlug)).toEqual(['ana-o-brien-jr'])
    const ana = await getBoxerProfile(test.db, 'ana-o-brien-jr')
    expect(ana?.boxer).toMatchObject({ proDivision: null, proStatus: null })
    expect(ana?.bouts.map(bout => [bout.opponentSlug, bout.titleFight, bout.eventName])).toEqual([
      ['bea-brown', false, 'Granby Halls, Leicester'],
      [null, true, null]
    ])
  })

  it('applies a refresh: changed fields, a shorter bout list and a moved opponent link', async () => {
    const [ana, bea] = opponentPair() as [SourceBoxer, SourceBoxer]
    await runImport(prepareDataset([ana, bea]))
    const [{ id: keptBoutId }] = await all(
      'SELECT id FROM bouts WHERE boxer_id = 2 AND ordinal = 0'
    )

    const refreshed = structuredClone([ana, bea])
    refreshed[0]!.bouts = [refreshed[0]!.bouts![1]!] // Ana's list shrinks; the Bea bout is gone.
    refreshed[1]!.proWins = 2
    refreshed[1]!.bouts![0] = sourceBout(bea, '900', 'Cy Nobody')
    const written = await runImport(prepareDataset(refreshed))
    expect(written).toBeGreaterThan(0)

    expect(
      await all('SELECT boxer_id, ordinal, opponent_name, opponent_boxer_id FROM bouts ORDER BY id')
    ).toEqual([
      { boxer_id: 1, ordinal: 0, opponent_name: 'Cy Nobody', opponent_boxer_id: null },
      { boxer_id: 2, ordinal: 0, opponent_name: 'Cy Nobody', opponent_boxer_id: null }
    ])
    const [{ id: sameBoutId }] = await all(
      'SELECT id FROM bouts WHERE boxer_id = 2 AND ordinal = 0'
    )
    expect(sameBoutId).toBe(keptBoutId)
    expect(await all('SELECT pro_wins FROM boxers WHERE id = 2')).toEqual([{ pro_wins: 2 }])
  })

  it('refuses a BoxRec id that arrives under a different pipeline id', async () => {
    await runImport(prepareDataset(opponentPair()))
    const [ana, bea] = opponentPair() as [SourceBoxer, SourceBoxer]
    const moved = { ...bea, id: 3, slug: 'bea-brown-2' }
    await expect(runImport(prepareDataset([ana, moved]))).rejects.toThrow(
      /UNIQUE constraint failed: boxers.boxrec_id/
    )
  })

  it('applies a bout added at index 0, and touches only the boxers whose page changes', async () => {
    const [ana, bea] = opponentPair() as [SourceBoxer, SourceBoxer]
    bea.bouts!.push(sourceBout(bea, '902', 'Cy Nobody'))
    const dee = sourceBoxer(4, 'Dee Dunn', { bouts: [] })
    dee.bouts!.push(sourceBout(dee, '940', 'Nobody Known'))
    const eve = sourceBoxer(5, 'Eve Evans', { bouts: [] })
    eve.bouts!.push(sourceBout(eve, '950', 'Someone'), sourceBout(eve, '951', 'Someone Else'))
    await runImport(prepareDataset([ana, bea, dee, eve]))

    const refreshed = structuredClone([ana, bea, dee, eve])
    // Ana: a new first bout, so every ordinal shifts and her links move between ordinals.
    refreshed[0]!.bouts!.unshift(sourceBout(ana, '899', 'Dee Dunn', { result: 'loss' }))
    // Eve: the list shrinks. Cy: a new boxer, so Bea's (unchanged) bout against Cy now links.
    refreshed[3]!.bouts!.pop()
    const cy = sourceBoxer(3, 'Cy Nobody')
    const dataset = prepareDataset([...refreshed, cy])

    expect(await touchedBy(() => runImport(dataset))).toEqual([1, 2, 3, 5])
    const names = { 'Bea Brown': 2, "Ana O'Brien": 1, 'Cy Nobody': 3, 'Dee Dunn': 4 }
    expect(await parityMismatches([...refreshed, cy], names)).toEqual([])
    expect(await touchedBy(() => runImport(dataset))).toEqual([])
  })

  it('prunes boxers the source no longer has, with their bouts and links', async () => {
    await runImport(prepareDataset([...opponentPair(), sourceBoxer(4, 'Dee Dunn')]))
    const pruned = () =>
      test.binding.batch(buildPrune([2]).map(statement => test.binding.prepare(statement)))
    // Ana linked to Bea, so her page changes; Dee's doesn't.
    expect(await touchedBy(pruned)).toEqual([1])
    expect(
      await all('SELECT boxer_id, opponent_boxer_id FROM bouts ORDER BY boxer_id, ordinal')
    ).toEqual([
      { boxer_id: 1, opponent_boxer_id: null },
      { boxer_id: 1, opponent_boxer_id: null }
    ])
  })

  it('keeps every statement within D1 memory at full scale', async () => {
    // A 5,570-row VALUES list fails with SQLITE_NOMEM in D1 (MAX_VALUES_ROWS).
    const records = Array.from({ length: 6_000 }, (_, i) => ({ id: i + 1, bouts: [] }))
    const unlinked = records.map(r => ({ boxer_id: r.id, ordinal: 0, opponent_boxer_id: null }))
    const statements = [
      ...buildTrims(records),
      ...buildOpponentLinks(unlinked),
      ...buildPrune(records.map(record => record.id))
    ]
    await expect(
      test.binding.batch(statements.map(statement => test.binding.prepare(statement)))
    ).resolves.toHaveLength(statements.length)
  })
})
