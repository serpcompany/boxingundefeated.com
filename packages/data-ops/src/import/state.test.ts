import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { getDatasetState } from '../queries'
import { createTestDatabase, type TestDatabase } from '../test-support'
import { buildImportComplete, buildImportStart, datasetVersion } from '.'

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

describe('datasetVersion', () => {
  it('changes with any table checksum and nothing else', () => {
    const checksums = { divisions: 'd', boxers: 'b', bouts: 'o' }
    expect(datasetVersion(checksums)).toMatch(/^[0-9a-f]{16}$/)
    expect(datasetVersion({ ...checksums })).toBe(datasetVersion(checksums))
    expect(datasetVersion({ ...checksums, bouts: 'x' })).not.toBe(datasetVersion(checksums))
  })
})
