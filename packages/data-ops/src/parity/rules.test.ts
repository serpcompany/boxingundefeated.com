import { readFileSync } from 'node:fs'
import { getTableColumns } from 'drizzle-orm'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { buildImportStatements, type ImportDataset, prepareDataset, type Row } from '../import'
import { sourceBout, sourceBoxer } from '../import/test-records'
import { bouts, boxers } from '../schema'
import { createTestDatabase, type TestDatabase } from '../test-support'
import {
  BOUT_FIELD_MAP,
  BOXER_FIELD_MAP,
  compareBoxerRecord,
  type D1Row,
  DERIVED_COLUMNS,
  storedAs,
  UNSTORED_BOXER_KEYS,
  unaccountedColumns
} from './rules'

/** A record whose every field holds a distinct value, so a swapped or dropped field shows. */
function distinctRecord() {
  const record = sourceBoxer(7, 'Gus Distinct', {
    birthName: 'Birth Name 1',
    nicknames: '"Nick 2"',
    avatarImage: 'https://example.test/avatar-3.png',
    residence: 'Residence 4',
    birthPlace: 'Birth Place 5',
    dateOfBirth: 'Date of birth 6',
    gender: 'F',
    nationality: 'Nationality 7',
    height: '181',
    reach: '192',
    stance: 'southpaw',
    bio: '<p>Bio 8</p>',
    promoters: 'Promoter 9\r\nPromoter 10',
    trainers: 'Trainer 11',
    managers: '',
    gym: 'Gym 13',
    proDebutDate: '2001-02-03',
    proDivision: 'cruiser',
    proWins: 21,
    proWinsByKnockout: 22,
    proLosses: 23,
    proLossesByKnockout: 24,
    proDraws: 25,
    proStatus: 'active',
    proTotalBouts: 26,
    proTotalRounds: 27,
    createdAt: 'Created 28',
    updatedAt: 'Updated 29'
  })
  record.bouts = [
    sourceBout(record, '31', 'Opponent 32', {
      boutDate: '2002-03-04',
      opponentWeight: 'Weight 33',
      opponentRecord: 'Record 34',
      eventName: 'Event 35',
      refereeName: 'Referee 36',
      judge1Name: 'Judge 37',
      judge1Score: 'Score 38',
      judge2Name: 'Judge 39',
      judge2Score: 'Score 40',
      judge3Name: 'Judge 41',
      judge3Score: 'Score 42',
      numRoundsScheduled: 43,
      result: 'draw',
      resultMethod: 'Method 44',
      resultRound: 'Round 45',
      eventPageLink: 'https://example.test/event-46',
      boutPageLink: 'https://example.test/bout-47',
      scorecardsPageLink: 'https://example.test/cards-48',
      titleFight: true
    }),
    sourceBout(record, '49', 'Opponent 50', { eventName: '' })
  ]
  return record
}

let test: TestDatabase
beforeEach(async () => {
  test = await createTestDatabase()
})
afterEach(async () => {
  await test.dispose()
})

async function importAndRead(dataset: ImportDataset): Promise<{ boxer: D1Row; bouts: D1Row[] }> {
  await test.binding.batch(
    buildImportStatements(dataset).map(statement => test.binding.prepare(statement))
  )
  const all = async (sql: string) => (await test.binding.prepare(sql).all<D1Row>()).results
  const [boxer] = await all('SELECT * FROM boxers')
  return { boxer: boxer!, bouts: await all('SELECT * FROM bouts ORDER BY ordinal') }
}

const noOpponents = () => null

describe('parity rules (independent of the importer mapping)', () => {
  it('never imports the importer mapping', () => {
    const source = readFileSync(new URL('./rules.ts', import.meta.url), 'utf8')
    expect(source).not.toMatch(/from '\.\.\/import/)
  })

  it('accounts for every JSON key and every column of the schema', () => {
    const columns = (table: typeof boxers | typeof bouts) =>
      Object.values(getTableColumns(table))
        .map(column => column.name)
        .sort()
    expect(
      [...Object.values(BOXER_FIELD_MAP).map(([c]) => c), ...DERIVED_COLUMNS.boxers].sort()
    ).toEqual(columns(boxers))
    expect(
      [...Object.values(BOUT_FIELD_MAP).map(([c]) => c), ...DERIVED_COLUMNS.bouts].sort()
    ).toEqual(columns(bouts))
    const keys = Object.keys(distinctRecord())
    expect(keys.filter(k => !(k in BOXER_FIELD_MAP) && !UNSTORED_BOXER_KEYS.includes(k))).toEqual(
      []
    )
  })

  it('applies each named rule', () => {
    expect(storedAs('empty-is-null', '', null)).toBe(true)
    expect(storedAs('empty-is-null', 'x', 'x')).toBe(true)
    expect(storedAs('empty-is-null', 'x', null)).toBe(false)
    expect(storedAs('same', '', null)).toBe(false)
    expect(storedAs('name-list', 'A\r\n B \n\n', '["A","B"]')).toBe(true)
    expect(storedAs('name-list', null, '[]')).toBe(true)
    expect(storedAs('name-list', 'A\nB', '["B","A"]')).toBe(false)
    expect(storedAs('boolean', true, 1)).toBe(true)
    expect(storedAs('boolean', false, 1)).toBe(false)
  })

  it('finds no mismatch after a real import of a record with a distinct value in every field', async () => {
    const record = distinctRecord()
    const { boxer, bouts } = await importAndRead(prepareDataset([record]))
    const result = compareBoxerRecord(record, boxer, bouts, noOpponents)
    expect(result.mismatches).toEqual([])
    expect(result.bouts).toBe(2)
    expect(unaccountedColumns('boxers', boxer)).toEqual([])
    expect(unaccountedColumns('bouts', bouts[0]!)).toEqual([])
  })

  it('reports every field that a broken mapping swaps or drops', async () => {
    const record = distinctRecord()
    const dataset = prepareDataset([record])
    // A mapping with height and reach swapped and the gym and referee lines deleted.
    const broken: ImportDataset = {
      ...dataset,
      boxers: dataset.boxers.map(row => ({
        ...row,
        height: row.reach!,
        reach: row.height!,
        gym: null
      })),
      bouts: dataset.bouts.map((row): Row => ({ ...row, referee_name: null }))
    }
    const { boxer, bouts } = await importAndRead(broken)
    const { mismatches } = compareBoxerRecord(record, boxer, bouts, noOpponents)
    expect(mismatches.map(m => [m.where, m.field, m.expected, m.actual])).toEqual([
      ['boxer 7 (gus-distinct)', 'height', '181', '192'],
      ['boxer 7 (gus-distinct)', 'reach', '192', '181'],
      ['boxer 7 (gus-distinct)', 'gym', 'Gym 13', null],
      ['bout 7#0', 'referee_name', 'Referee 36', null]
    ])
  })

  it('reports unknown keys, missing and extra bouts, and wrong opponent links', async () => {
    const record = distinctRecord()
    const { boxer, bouts } = await importAndRead(prepareDataset([record]))
    const changed = { ...record, newField: 1, bouts: [record.bouts![0]!] }
    const fields = compareBoxerRecord(changed, boxer, bouts, () => 99).mismatches.map(m => [
      m.where,
      m.field
    ])
    expect(fields).toEqual([
      ['boxer 7 (gus-distinct)', 'newField'],
      ['boxer 7 (gus-distinct)', 'bouts'],
      ['bout 7#0', 'opponent_boxer_id'],
      ['bout 7#1', '(row)']
    ])
    expect(compareBoxerRecord(record, undefined, [], noOpponents).mismatches).toHaveLength(1)
  })
})
