/**
 * @jest-environment node
 */
import {
  DATASET_ERROR_TTL_MS,
  DATASET_STATE_TTL_MS,
  DatasetReadinessMemo,
  type DatasetState,
  datasetUnavailable,
  importGeneration,
  readinessOf,
  readsD1
} from './dataset-gate'

jest.mock('@boxingundefeated/data-ops', () => ({}))

const at = (path: string) => new Request(`https://boxingundefeated.com${path}`)

describe('readsD1', () => {
  it('matches every page that renders from D1, with or without a query', () => {
    for (const path of [
      '/',
      '/?_rsc=abc',
      '/boxers/',
      '/boxers/page/2/',
      '/boxers/page/999/',
      '/boxers/jesse-hart/',
      '/boxers/jesse-hart/?_rsc=abc',
      '/divisions/',
      '/divisions/heavy/',
      '/divisions/no-such-division/',
      '/divisions/heavy/page/2/',
      '/sitemap/'
    ]) {
      expect([path, readsD1(at(path))]).toEqual([path, true])
    }
  })

  it('leaves out other pages and files', () => {
    for (const path of [
      '/about/',
      '/search/',
      '/shop/',
      '/shop/page/2/',
      '/shop/best/boxing-gloves/',
      '/boxers/jesse-hart/fights/',
      '/divisions/heavy/page/2/extra/',
      '/sitemap.xml',
      '/sitemaps/boxers/1.xml',
      '/data/boxers/x.json',
      '/api/search'
    ]) {
      expect([path, readsD1(at(path))]).toEqual([path, false])
    }
  })
})

describe('importGeneration', () => {
  it('changes with every finished import, a re-import of the same data included', () => {
    const first = importGeneration('v1', '2026-10-06 04:00:21.000')
    expect(first).toBe('v1@2026-10-06 04:00:21.000')
    expect(importGeneration('v1', '2026-10-06 04:30:00.000')).not.toBe(first)
    expect(importGeneration('v2', '2026-10-06 04:00:21.000')).not.toBe(first)
  })

  it('falls back to the version for a marker written before imports recorded their finish', () => {
    expect(importGeneration('v1', null)).toBe('v1')
  })
})

describe('readinessOf', () => {
  it('is not ready before a first import finishes', () => {
    expect(readinessOf(null).ready).toBe(false)
    expect(readinessOf({ version: null, importing: true }).ready).toBe(false)
    expect(readinessOf({ version: null, importing: false }).ready).toBe(false)
  })

  it('is ready with the last complete import, also during a re-import', () => {
    const completedAt = '2026-10-06 04:00:21.000'
    expect(readinessOf({ version: 'v1', importing: false, completedAt })).toEqual({
      ready: true,
      version: 'v1',
      generation: 'v1@2026-10-06 04:00:21.000',
      importing: false
    })
    expect(readinessOf({ version: 'v1', importing: true, completedAt })).toMatchObject({
      generation: 'v1@2026-10-06 04:00:21.000',
      importing: true
    })
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
