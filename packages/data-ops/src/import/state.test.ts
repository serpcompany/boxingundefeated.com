import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { getDatasetState } from '../queries'
import { createTestDatabase, type TestDatabase } from '../test-support'
import {
  buildImportComplete,
  buildImportStart,
  DATASET_STATE_QUERY,
  DATASET_STATE_TABLE_QUERY,
  type DatasetStateRow,
  datasetVersion,
  importInProgress
} from '.'

let test: TestDatabase
beforeEach(async () => {
  test = await createTestDatabase()
})
afterEach(async () => {
  await test.dispose()
})

const run = (sql: string) => test.binding.prepare(sql).run()
const row = () =>
  test.binding
    .prepare('SELECT * FROM dataset_state')
    .all()
    .then(result => result.results)

describe('dataset_state', () => {
  it('is empty until an import starts', async () => {
    expect(await getDatasetState(test.db)).toBeNull()
  })

  it('has no version during a first import, then the version once it finishes', async () => {
    await run(buildImportStart())
    expect(await getDatasetState(test.db)).toEqual({
      version: null,
      importing: true,
      completedAt: null
    })

    await run(buildImportComplete('abc123'))
    expect(await getDatasetState(test.db)).toMatchObject({ version: 'abc123', importing: false })
  })

  it('keeps the last complete version during a re-import', async () => {
    await run(buildImportStart())
    await run(buildImportComplete('v1'))
    await run(buildImportStart())

    expect(await getDatasetState(test.db)).toMatchObject({ version: 'v1', importing: true })
    await run(buildImportComplete('v2'))
    expect(await getDatasetState(test.db)).toMatchObject({ version: 'v2', importing: false })
  })

  it('records when each import finished, a re-import of the same data included', async () => {
    await run(buildImportStart())
    await run(buildImportComplete('v1'))
    await run("UPDATE dataset_state SET completed_at = '2000-01-01 00:00:00.000'")

    await run(buildImportStart())
    expect(await getDatasetState(test.db)).toEqual({
      version: 'v1',
      importing: true,
      completedAt: '2000-01-01 00:00:00.000'
    })

    await run(buildImportComplete('v1'))
    const state = await getDatasetState(test.db)
    expect(state).toMatchObject({ version: 'v1', importing: false })
    expect(state?.completedAt).toMatch(/^\d{4}-\d\d-\d\d \d\d:\d\d:\d\d\.\d{3}$/)
    expect(state?.completedAt).not.toBe('2000-01-01 00:00:00.000')
    expect(await row()).toHaveLength(1)
  })

  it('holds one row only', async () => {
    await expect(run('INSERT INTO dataset_state (id) VALUES (2)')).rejects.toThrow(/CHECK/)
  })
})

// What `db:check-deployable --importing-only` reads before a deploy migrates (#104).
describe('import in progress', () => {
  const read = <T>(sql: string) =>
    test.binding
      .prepare(sql)
      .all<T>()
      .then(result => result.results)
  const inProgress = async () => importInProgress(await read<DatasetStateRow>(DATASET_STATE_QUERY))

  it('finds dataset_state on a migrated D1, and not on one before migration 0001', async () => {
    expect(await read(DATASET_STATE_TABLE_QUERY)).toEqual([{ tables: 1 }])
    await run('DROP TABLE dataset_state')
    expect(await read(DATASET_STATE_TABLE_QUERY)).toEqual([{ tables: 0 }])
  })

  it('is none before the first import starts', async () => {
    expect(await inProgress()).toBeUndefined()
  })

  it('is a first import from its start until it finishes', async () => {
    await run(buildImportStart())
    expect(await inProgress()).toBe(
      'dataset_state says an import is in progress, or stopped before it finished ' +
        '(no import has finished yet)'
    )
    await run(buildImportComplete('v1'))
    expect(await inProgress()).toBeUndefined()
  })

  it('is a re-import until it finishes, naming the last finished version', async () => {
    await run(buildImportStart())
    await run(buildImportComplete('v1'))
    await run(buildImportStart())
    expect(await inProgress()).toMatch(/in progress, or stopped .*the last finished import is v1/)
    await run(buildImportComplete('v2'))
    expect(await inProgress()).toBeUndefined()
  })

  it('fails closed on any importing value but 0 or false', () => {
    for (const importing of [0, false]) {
      expect(importInProgress([{ version: 'v1', importing }])).toBeUndefined()
    }
    for (const importing of [1, true, '0', '1', null, undefined, 2]) {
      expect(importInProgress([{ version: 'v1', importing }])).toMatch(/in progress/)
    }
  })
})

describe('datasetVersion', () => {
  it('changes with any table checksum and nothing else', () => {
    const checksums = { divisions: 'd', boxers: 'b', bouts: 'o' }
    expect(datasetVersion(checksums)).toMatch(/^[0-9a-f]{16}$/)
    expect(datasetVersion({ ...checksums })).toBe(datasetVersion(checksums))
    expect(datasetVersion({ ...checksums, bouts: 'x' })).not.toBe(datasetVersion(checksums))
  })
})
