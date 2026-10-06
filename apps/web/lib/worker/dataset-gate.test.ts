/**
 * @jest-environment node
 */
import {
  DATASET_ERROR_TTL_MS,
  DATASET_STATE_TTL_MS,
  DatasetReadinessMemo,
  type DatasetState,
  datasetUnavailable,
  readinessOf,
  readsD1
} from './dataset-gate'

jest.mock('@boxingundefeated/data-ops', () => ({}))

const at = (path: string) => new Request(`https://boxingundefeated.com${path}`)

describe('readsD1', () => {
  it('matches boxer profiles, with or without a query', () => {
    expect(readsD1(at('/boxers/jesse-hart/'))).toBe(true)
    expect(readsD1(at('/boxers/jesse-hart/?_rsc=abc'))).toBe(true)
  })

  it('leaves out listings, other pages and files', () => {
    for (const path of ['/boxers/', '/boxers/page/2/', '/', '/about/', '/data/boxers/x.json']) {
      expect(readsD1(at(path))).toBe(false)
    }
  })
})

describe('readinessOf', () => {
  it('is not ready before a first import finishes', () => {
    expect(readinessOf(null).ready).toBe(false)
    expect(readinessOf({ version: null, importing: true }).ready).toBe(false)
    expect(readinessOf({ version: null, importing: false }).ready).toBe(false)
  })

  it('is ready with the last complete version, also during a re-import', () => {
    expect(readinessOf({ version: 'v1', importing: false })).toEqual({
      ready: true,
      version: 'v1',
      importing: false
    })
    expect(readinessOf({ version: 'v1', importing: true })).toMatchObject({ importing: true })
  })
})

describe('datasetUnavailable', () => {
  it('is a 503 that no cache keeps and crawlers retry', () => {
    const response = datasetUnavailable(at('/boxers/jesse-hart/'))
    expect(response.status).toBe(503)
    expect(response.headers.get('cache-control')).toBe('no-store')
    expect(response.headers.get('retry-after')).toBe('120')
  })
})

describe('DatasetReadinessMemo', () => {
  function memo(load: () => Promise<DatasetState | null>) {
    let now = 0
    const instance = new DatasetReadinessMemo(load, () => now)
    return {
      instance,
      advance(ms: number) {
        now += ms
      }
    }
  }

  it('reads dataset_state once per TTL, sharing concurrent reads', async () => {
    const load = jest.fn(async () => ({ version: 'v1', importing: false }))
    const { instance, advance } = memo(load)

    await Promise.all([instance.current(), instance.current()])
    advance(DATASET_STATE_TTL_MS - 1)
    await instance.current()
    expect(load).toHaveBeenCalledTimes(1)

    advance(1)
    await instance.current()
    expect(load).toHaveBeenCalledTimes(2)
  })

  it('treats an unreadable dataset_state as not ready, and retries it sooner', async () => {
    const load = jest.fn(async (): Promise<DatasetState | null> => {
      throw new Error('no such table: dataset_state')
    })
    const { instance, advance } = memo(load)

    expect(await instance.current()).toEqual({
      ready: false,
      reason: 'dataset_state is unreadable: no such table: dataset_state'
    })
    advance(DATASET_ERROR_TTL_MS)
    await instance.current()
    expect(load).toHaveBeenCalledTimes(2)
  })
})
