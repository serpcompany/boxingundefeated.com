/**
 * @jest-environment node
 */
import type { BoxerSearch } from '@boxingundefeated/data-ops'
import type { DatasetReadiness } from './dataset-gate'
import { EDGE_CACHE_HEADER } from './edge-cache'
import { handleWorkerRequest } from './handle-request'
import { MemoryCache } from './memory-cache'
import {
  d1SearchApi,
  errorSummary,
  handleSearchApi,
  isSearchApiRequest,
  type SearchApiOptions,
  searchCacheKey
} from './search-api'

const ORIGIN = 'https://boxingundefeated.com'
const production = { SITE_ENVIRONMENT: 'production', CANONICAL_HOST_REDIRECT: 'on' }
const ready: DatasetReadiness = {
  ready: true,
  version: 'v1',
  generation: 'v1@t1',
  importing: false
}
const notReady: DatasetReadiness = { ready: false, reason: 'the first import has not finished' }

const floyd: BoxerSearch = {
  query: 'floyd',
  results: [
    {
      slug: 'floyd-mayweather-jr',
      name: 'Floyd Mayweather Jr',
      nicknames: '"Money,Pretty Boy"',
      nationality: 'USA',
      proDivision: 'welter',
      proWins: 50,
      proLosses: 0,
      proDraws: 0
    }
  ],
  truncated: false
}

/** What drizzle-orm throws for a failed D1 query: the SQL and its values, with D1's error as the cause. */
function drizzleError(query: string): Error {
  const error = new Error(
    `Failed query: select "slug" from "boxers" where instr(?)\nparams: ${query}`,
    {
      cause: new Error('D1_ERROR: LIKE or GLOB pattern too complex: SQLITE_ERROR')
    }
  )
  error.name = 'DrizzleQueryError'
  return error
}

function setup(overrides: Partial<SearchApiOptions> = {}) {
  let readiness = ready
  const cache = new MemoryCache()
  const pending: Promise<unknown>[] = []
  const search = jest.fn(async (query: string): Promise<BoxerSearch> => ({ ...floyd, query }))
  const observe = jest.fn()
  const options: SearchApiOptions = {
    search,
    readiness: jest.fn(async () => readiness),
    edgeCache: {
      context: { waitUntil: promise => void pending.push(promise) },
      openCache: async () => cache as unknown as Cache
    },
    deploymentId: 'version-1',
    observe,
    ...overrides
  }
  return {
    cache,
    search,
    observe,
    options,
    become(next: DatasetReadiness) {
      readiness = next
    },
    async fetch(path: string, init?: RequestInit) {
      const response = await handleSearchApi(new Request(`${ORIGIN}${path}`, init), options)
      await Promise.all(pending.splice(0))
      return response
    }
  }
}

describe('isSearchApiRequest', () => {
  it.each([
    ['/api/search', true],
    ['/api/search/', true],
    ['/api/search?q=ali', true],
    ['/api/search/?q=ali', true],
    ['/api/search/x', false],
    ['/API/search', false],
    ['/search/', false],
    ['/api', false]
  ])('%s: %s', (path, expected) => {
    expect(isSearchApiRequest(new Request(`${ORIGIN}${path}`))).toBe(expected)
  })
})

describe('GET /api/search through the Worker pipeline', () => {
  function pipeline() {
    const api = setup()
    const serve = jest.fn(async () => new Response('OpenNext', { status: 404 }))
    const runtime = { searchApi: (request: Request) => handleSearchApi(request, api.options) }
    return { api, serve, runtime }
  }

  it.each(['/api/search?q=floyd', '/api/search/?q=floyd', '/api/search', '/api/search/'])(
    'answers %s with 200, never a redirect, without OpenNext',
    async path => {
      const { serve, runtime } = pipeline()
      const response = await handleWorkerRequest(
        new Request(`${ORIGIN}${path}`),
        production,
        serve,
        runtime
      )

      expect(response.status).toBe(200)
      expect(response.headers.get('location')).toBeNull()
      expect(response.headers.get('content-type')).toBe('application/json; charset=utf-8')
      expect(serve).not.toHaveBeenCalled()
    }
  )

  it('keeps the exact path when it redirects a non-canonical host', async () => {
    const { serve, runtime } = pipeline()
    for (const path of ['/api/search?q=ali', '/api/search/?q=ali']) {
      const response = await handleWorkerRequest(
        new Request(`https://www.boxingundefeated.com${path}`),
        production,
        serve,
        runtime
      )
      expect(response.status).toBe(308)
      expect(response.headers.get('location')).toBe(`${ORIGIN}${path}`)
    }
  })

  it('applies the crawl policy outside production', async () => {
    const { serve, runtime } = pipeline()
    const response = await handleWorkerRequest(
      new Request('https://staging.boxingundefeated.com/api/search?q=ali'),
      { SITE_ENVIRONMENT: 'staging', CANONICAL_HOST_REDIRECT: 'on' },
      serve,
      runtime
    )
    expect(response.status).toBe(200)
    expect(response.headers.get('x-robots-tag')).toBe('noindex')
  })

  it('leaves every other /api path to OpenNext', async () => {
    const { serve, runtime } = pipeline()
    const response = await handleWorkerRequest(
      new Request(`${ORIGIN}/api/searches?q=ali`),
      production,
      serve,
      runtime
    )
    expect(response.status).toBe(404)
    expect(serve).toHaveBeenCalledTimes(1)
  })
})

describe('handleSearchApi', () => {
  it('answers the fields a result card shows, for the normalized query', async () => {
    const api = setup()
    const response = await api.fetch('/api/search?q=%20Floyd%20')

    expect(response.status).toBe(200)
    expect(response.headers.get('cache-control')).toBe('public, max-age=60')
    expect(response.headers.get('x-robots-tag')).toBe('noindex')
    expect(await response.json()).toEqual({
      query: 'floyd',
      results: [
        {
          slug: 'floyd-mayweather-jr',
          name: 'Floyd Mayweather Jr',
          nicknames: '"Money,Pretty Boy"',
          nationality: 'USA',
          division: 'welter',
          wins: 50,
          losses: 0,
          draws: 0
        }
      ],
      truncated: false
    })
    expect(api.search).toHaveBeenCalledWith('floyd')
  })

  it('answers an empty query, or one with no letters or digits, without searching', async () => {
    const api = setup()
    for (const path of [
      '/api/search',
      '/api/search?q=',
      '/api/search?q=%25%25',
      '/api/search?q=_'
    ]) {
      const response = await api.fetch(path)
      expect(response.status).toBe(200)
      expect(await response.json()).toEqual({ query: '', results: [], truncated: false })
    }
    expect(api.search).not.toHaveBeenCalled()
  })

  it('refuses a query over 100 characters with 400', async () => {
    const api = setup()
    const response = await api.fetch(`/api/search?q=${'a'.repeat(101)}`)

    expect(response.status).toBe(400)
    expect(response.headers.get('cache-control')).toBe('no-store')
    expect(await response.json()).toEqual({ error: 'q is longer than 100 characters.' })
    expect((await api.fetch(`/api/search?q=${'a'.repeat(100)}`)).status).toBe(200)
  })

  it('refuses methods other than GET and HEAD with 405', async () => {
    const api = setup()
    const response = await api.fetch('/api/search?q=ali', { method: 'POST' })

    expect(response.status).toBe(405)
    expect(response.headers.get('allow')).toBe('GET, HEAD')
    expect(api.search).not.toHaveBeenCalled()
  })

  it('answers 503, never an empty result, until a first import finishes', async () => {
    const api = setup()
    api.become(notReady)
    const response = await api.fetch('/api/search?q=floyd')

    expect(response.status).toBe(503)
    expect(response.headers.get('retry-after')).toBe('120')
    expect(response.headers.get('cache-control')).toBe('no-store')
    expect(await response.json()).toEqual({
      error: 'Boxer data is being updated. Please try again in a few minutes.'
    })
    expect(api.search).not.toHaveBeenCalled()
    expect(api.cache.stored.size).toBe(0)
    expect(api.observe).toHaveBeenCalledWith({
      event: 'dataset_unavailable',
      reason: 'the first import has not finished'
    })
  })

  it('caches by normalized query, so differently typed queries share one entry', async () => {
    const api = setup()
    const first = await api.fetch('/api/search?q=Floyd%20%20Mayweather')
    const second = await api.fetch('/api/search/?q=floyd%20mayweather!&utm_source=x')

    expect(first.headers.get(EDGE_CACHE_HEADER)).toBe('MISS')
    expect(second.headers.get(EDGE_CACHE_HEADER)).toBe('HIT')
    expect(second.headers.get('cache-control')).toBe('public, max-age=60')
    expect(await second.json()).toEqual(await first.json())
    expect(api.search).toHaveBeenCalledTimes(1)
    expect([...api.cache.stored.keys()]).toEqual([
      'https://edge-cache.invalid/version-1/v1%40t1/api-search/boxingundefeated.com?q=floyd%20mayweather'
    ])
  })

  it('bounds the cache key to the first terms of a short query', async () => {
    const key = searchCacheKey(
      new Request(`${ORIGIN}/api/search?q=whatever`),
      'version-1',
      'v1',
      'a b c d e f'
    )
    expect(key.url).toBe(
      'https://edge-cache.invalid/version-1/v1/api-search/boxingundefeated.com?q=a%20b%20c%20d%20e%20f'
    )
    const api = setup()
    await api.fetch(`/api/search?q=${encodeURIComponent('a b c d e f g h i j')}`)
    expect(api.search).toHaveBeenCalledWith('a b c d e f')
  })

  it('keys the cache by import generation, so every finished import is searched afresh', async () => {
    const api = setup()
    await api.fetch('/api/search?q=ali')
    // Same data, so the same version, but a later import.
    api.become({ ready: true, version: 'v1', generation: 'v1@t2', importing: false })
    const response = await api.fetch('/api/search?q=ali')

    expect(response.headers.get(EDGE_CACHE_HEADER)).toBe('MISS')
    expect(api.search).toHaveBeenCalledTimes(2)
  })

  it('stores nothing during a re-import, but serves results stored before it', async () => {
    const api = setup()
    await api.fetch('/api/search?q=ali')
    api.become({ ready: true, version: 'v1', generation: 'v1@t1', importing: true })

    expect((await api.fetch('/api/search?q=ali')).headers.get(EDGE_CACHE_HEADER)).toBe('HIT')
    await api.fetch('/api/search?q=bob')
    await api.fetch('/api/search?q=bob')
    expect(api.search).toHaveBeenCalledTimes(3)
    expect(api.cache.stored.size).toBe(1)
  })

  it('answers a failed search with a generic 500, logs only its root cause, and never caches it', async () => {
    const api = setup()
    api.search.mockRejectedValueOnce(drizzleError('philippines luisito'))
    const failed = await api.fetch('/api/search?q=philippines%20luisito')

    expect(failed.status).toBe(500)
    expect(failed.headers.get('cache-control')).toBe('no-store')
    const body = await failed.text()
    expect(JSON.parse(body)).toEqual({ error: 'Search failed. Please try again.' })
    expect(api.cache.stored.size).toBe(0)
    expect(api.observe).toHaveBeenCalledWith({
      event: 'search_api',
      state: 'BYPASS',
      status: 500,
      terms: 2,
      error: 'Error: D1_ERROR: LIKE or GLOB pattern too complex: SQLITE_ERROR'
    })
    const logged = JSON.stringify(api.observe.mock.calls)
    for (const leak of ['select', 'philippines', 'params']) {
      expect(logged).not.toContain(leak)
      expect(body).not.toContain(leak)
    }

    const retried = await api.fetch('/api/search?q=philippines%20luisito')
    expect(retried.status).toBe(200)
    expect(retried.headers.get(EDGE_CACHE_HEADER)).toBe('MISS')
  })

  it('answers HEAD without a body and without storing it', async () => {
    const api = setup()
    const response = await api.fetch('/api/search?q=ali', { method: 'HEAD' })

    expect(response.status).toBe(200)
    expect(response.body).toBeNull()
    expect(api.cache.stored.size).toBe(0)
  })

  it('caches nothing without a Worker version', async () => {
    const api = setup({ deploymentId: undefined })
    const response = await api.fetch('/api/search?q=ali')

    expect(response.status).toBe(200)
    expect(response.headers.has(EDGE_CACHE_HEADER)).toBe(false)
    expect(api.cache.stored.size).toBe(0)
  })
})

describe('errorSummary', () => {
  it('names the root cause, never the SQL or its values', () => {
    expect(errorSummary(drizzleError('ali'))).toBe(
      'Error: D1_ERROR: LIKE or GLOB pattern too complex: SQLITE_ERROR'
    )
    const bare = new Error('Failed query: select 1\nparams: ali')
    bare.name = 'DrizzleQueryError'
    expect(errorSummary(bare)).toBe('DrizzleQueryError')
    expect(errorSummary(new Error('x'.repeat(500)))).toHaveLength(200)
    expect(errorSummary('a string')).toBe('unknown error')
  })
})

describe('d1SearchApi', () => {
  it('fails closed with 500 when the DB binding is missing', async () => {
    const handler = d1SearchApi({}, { readiness: async () => ready })
    const response = await handler(new Request(`${ORIGIN}/api/search?q=ali`))
    expect(response.status).toBe(500)
  })
})
