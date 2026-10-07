/**
 * @jest-environment node
 */
import { SMOKE_TEST_HEADER } from '../routing/canonical-host'
import { BUILD_COMMIT_HEADER } from './build-environment'
import { type DatasetReadiness, importGeneration } from './dataset-gate'
import { EDGE_CACHE_HEADER } from './edge-cache'
import { handleWorkerRequest, type WorkerRuntime } from './handle-request'
import { MemoryCache } from './memory-cache'

const production = { SITE_ENVIRONMENT: 'production', CANONICAL_HOST_REDIRECT: 'on' }
const staging = { SITE_ENVIRONMENT: 'staging', CANONICAL_HOST_REDIRECT: 'on' }
const local = { SITE_ENVIRONMENT: 'local', CANONICAL_HOST_REDIRECT: 'off' }

const WWW = 'https://www.boxingundefeated.com'
const WORKERS_DEV = 'https://boxingundefeated-com-production.serp.workers.dev'
const STAGING_WORKERS_DEV = 'https://boxingundefeated-com-staging.serp.workers.dev'

// Pages and files from `public/` both reach the Worker (`assets.run_worker_first`).
const paths = ['/', '/boxers/len-wickwar/', '/sitemap-index.xml', '/ads.txt', '/feeds/x.json']

function serveSpy() {
  return jest.fn(() => Promise.resolve(new Response('served', { status: 200 })))
}

describe('handleWorkerRequest', () => {
  it.each(paths)('redirects %s on a non-canonical host without reaching OpenNext', async path => {
    for (const host of [WWW, WORKERS_DEV]) {
      const serve = serveSpy()
      const response = await handleWorkerRequest(new Request(`${host}${path}`), production, serve)

      expect(response.status).toBe(308)
      expect(response.headers.get('location')).toBe(`https://boxingundefeated.com${path}`)
      expect(serve).not.toHaveBeenCalled()
    }
  })

  it('serves the canonical host in production without noindex', async () => {
    for (const path of paths) {
      const serve = serveSpy()
      const response = await handleWorkerRequest(
        new Request(`https://boxingundefeated.com${path}`),
        production,
        serve
      )

      expect(response.status).toBe(200)
      expect(response.headers.get('x-robots-tag')).toBeNull()
      expect(serve).toHaveBeenCalledTimes(1)
    }
  })

  it('applies the crawl policy to a smoke-test request on the staging workers.dev host', async () => {
    const headers = { [SMOKE_TEST_HEADER]: '1' }
    for (const path of paths) {
      const serve = serveSpy()
      const response = await handleWorkerRequest(
        new Request(`${STAGING_WORKERS_DEV}${path}`, { headers }),
        staging,
        serve
      )

      expect(response.status).toBe(200)
      expect(response.headers.get('x-robots-tag')).toBe('noindex')
      expect(serve).toHaveBeenCalledTimes(1)
    }

    const serve = serveSpy()
    const robots = await handleWorkerRequest(
      new Request(`${STAGING_WORKERS_DEV}/robots.txt`, { headers }),
      staging,
      serve
    )
    expect(await robots.text()).toMatch(/^Disallow: \/$/m)
    expect(serve).not.toHaveBeenCalled()
  })

  it('applies the crawl policy to the staging host', async () => {
    const serve = serveSpy()
    const response = await handleWorkerRequest(
      new Request('https://staging.boxingundefeated.com/sitemap-index.xml'),
      staging,
      serve
    )

    expect(response.headers.get('x-robots-tag')).toBe('noindex')
    expect(serve).toHaveBeenCalledTimes(1)
  })

  it('serves a local Worker on any host, with noindex', async () => {
    const serve = serveSpy()
    const response = await handleWorkerRequest(new Request(`${WORKERS_DEV}/ads.txt`), local, serve)

    expect(response.status).toBe(200)
    expect(response.headers.get('x-robots-tag')).toBe('noindex')
    expect(serve).toHaveBeenCalledTimes(1)
  })
})

describe('handleWorkerRequest with the edge cache', () => {
  const version = { CF_VERSION_METADATA: { id: 'version-1' } }

  function edgeCache(runtime: Omit<WorkerRuntime, 'edgeCache'> = {}) {
    const cache = new MemoryCache()
    const pending: Promise<unknown>[] = []
    const openCache = jest.fn(async () => cache as unknown as Cache)
    return {
      cache,
      openCache,
      runtime: {
        ...runtime,
        edgeCache: {
          context: { waitUntil: (promise: Promise<unknown>) => void pending.push(promise) },
          openCache
        }
      },
      settle: () => Promise.all(pending.splice(0))
    }
  }

  function pageSpy(status = 200) {
    return jest.fn((request: Request) =>
      Promise.resolve(
        new Response(`page ${new URL(request.url).pathname}`, {
          status,
          headers: { 'content-type': 'text/html; charset=utf-8' }
        })
      )
    )
  }

  async function fetchTwice(url: string, env: object, serve: ReturnType<typeof pageSpy>) {
    const edge = edgeCache()
    const first = await handleWorkerRequest(
      new Request(url),
      { ...env, ...version },
      serve,
      edge.runtime
    )
    await edge.settle()
    const second = await handleWorkerRequest(
      new Request(url),
      { ...env, ...version },
      serve,
      edge.runtime
    )
    await edge.settle()
    return { edge, first, second }
  }

  it('serves a stored page from the cache, without OpenNext, in production', async () => {
    const serve = pageSpy()
    const { first, second } = await fetchTwice(
      'https://boxingundefeated.com/boxers/len-wickwar/',
      production,
      serve
    )

    expect(first.headers.get(EDGE_CACHE_HEADER)).toBe('MISS')
    expect(second.headers.get(EDGE_CACHE_HEADER)).toBe('HIT')
    expect(await second.text()).toBe('page /boxers/len-wickwar/')
    expect(second.headers.get('x-robots-tag')).toBeNull()
    expect(serve).toHaveBeenCalledTimes(1)
  })

  it('adds noindex to a stored page outside production, as to a rendered one', async () => {
    const serve = pageSpy()
    const { first, second } = await fetchTwice(
      'https://staging.boxingundefeated.com/boxers/len-wickwar/',
      staging,
      serve
    )

    expect(first.headers.get('x-robots-tag')).toBe('noindex')
    expect(second.headers.get(EDGE_CACHE_HEADER)).toBe('HIT')
    expect(second.headers.get('x-robots-tag')).toBe('noindex')
  })

  it('redirects a non-canonical host before the cache, even for a stored page', async () => {
    const edge = edgeCache()
    const serve = pageSpy()
    const page = 'https://boxingundefeated.com/boxers/len-wickwar/'
    await handleWorkerRequest(new Request(page), { ...production, ...version }, serve, edge.runtime)
    await edge.settle()
    edge.openCache.mockClear()

    for (const host of [WWW, WORKERS_DEV]) {
      const response = await handleWorkerRequest(
        new Request(`${host}/boxers/len-wickwar/`),
        { ...production, ...version },
        serve,
        edge.runtime
      )
      expect(response.status).toBe(308)
      expect(response.headers.get('location')).toBe(page)
      expect(response.headers.has(EDGE_CACHE_HEADER)).toBe(false)
    }
    expect(edge.openCache).not.toHaveBeenCalled()
    expect(serve).toHaveBeenCalledTimes(1)
  })

  it('answers the non-production robots.txt before the cache', async () => {
    const edge = edgeCache()
    const serve = pageSpy()
    const response = await handleWorkerRequest(
      new Request('https://staging.boxingundefeated.com/robots.txt'),
      { ...staging, ...version },
      serve,
      edge.runtime
    )

    expect(await response.text()).toMatch(/^Disallow: \/$/m)
    expect(edge.openCache).not.toHaveBeenCalled()
    expect(serve).not.toHaveBeenCalled()
  })

  it.each(['/sitemap-index.xml', '/ads.txt', '/feeds/x.json'])(
    'passes the file %s to OpenNext as sent, every time, and returns it as served',
    async path => {
      const edge = edgeCache()
      const file = new Response('file', { headers: { 'content-type': 'application/xml' } })
      const serve = jest.fn((_request: Request) => Promise.resolve(file))
      const request = new Request(`https://boxingundefeated.com${path}`, {
        headers: { cookie: '_ga=1' }
      })

      const response = await handleWorkerRequest(
        request,
        { ...production, ...version },
        serve,
        edge.runtime
      )

      expect(response).toBe(file)
      expect(serve).toHaveBeenCalledWith(request)
      expect(edge.openCache).not.toHaveBeenCalled()
    }
  )

  it.each([
    [404, 'https://boxingundefeated.com/boxers/nobody/'],
    [308, 'https://boxingundefeated.com//boxers/'],
    [500, 'https://boxingundefeated.com/boxers/len-wickwar/']
  ])('renders a %i page again on every request', async (status, url) => {
    const serve = pageSpy(status)
    const { edge, second } = await fetchTwice(url, production, serve)

    expect(second.status).toBe(status)
    expect(serve).toHaveBeenCalledTimes(2)
    expect(edge.cache.stored.size).toBe(0)
  })
})

describe('handleWorkerRequest with the D1 readiness gate', () => {
  const version = { CF_VERSION_METADATA: { id: 'version-1' } }
  const PROFILE = 'https://boxingundefeated.com/boxers/len-wickwar/'

  function setup(initial: DatasetReadiness) {
    let readiness = initial
    const cache = new MemoryCache()
    const pending: Promise<unknown>[] = []
    const openCache = jest.fn(async () => cache as unknown as Cache)
    const log = jest.fn()
    const runtime: WorkerRuntime = {
      edgeCache: {
        context: { waitUntil: (promise: Promise<unknown>) => void pending.push(promise) },
        openCache
      },
      datasetReadiness: jest.fn(async () => readiness),
      log
    }
    let renders = 0
    const serve = jest.fn((request: Request) =>
      Promise.resolve(
        new Response(`render ${++renders} of ${new URL(request.url).pathname}`, {
          status: 200,
          headers: { 'content-type': 'text/html; charset=utf-8' }
        })
      )
    )
    return {
      cache,
      openCache,
      log,
      runtime,
      serve,
      become(next: DatasetReadiness) {
        readiness = next
      },
      async fetch(url = PROFILE, env: object = production) {
        const response = await handleWorkerRequest(
          new Request(url),
          { ...env, ...version } as never,
          serve,
          runtime
        )
        await Promise.all(pending.splice(0))
        return response
      }
    }
  }

  const notReady: DatasetReadiness = { ready: false, reason: 'the first import has not finished' }
  /** A finished import of version `version`, finished at `completedAt`. */
  function imported(version: string, completedAt: string, importing = false): DatasetReadiness {
    return { ready: true, version, generation: importGeneration(version, completedAt), importing }
  }
  const v1 = imported('v1', '2026-10-06 04:00:21.000')

  it('answers a profile with 503, never 404, until a first import finishes', async () => {
    const gate = setup(notReady)
    const response = await gate.fetch()

    expect(response.status).toBe(503)
    expect(response.headers.get('retry-after')).toBe('120')
    expect(response.headers.get('cache-control')).toBe('no-store')
    expect(gate.serve).not.toHaveBeenCalled()
    expect(gate.openCache).not.toHaveBeenCalled()
    expect(gate.log).toHaveBeenCalledWith({
      event: 'dataset_unavailable',
      reason: 'the first import has not finished'
    })
  })

  it('keeps noindex on the 503 outside production', async () => {
    const gate = setup(notReady)
    const response = await gate.fetch('https://staging.boxingundefeated.com/boxers/x/', staging)

    expect(response.status).toBe(503)
    expect(response.headers.get('x-robots-tag')).toBe('noindex')
  })

  it('answers listings, divisions, the homepage and the HTML sitemap with 503 as well', async () => {
    const gate = setup(notReady)
    for (const path of ['/', '/boxers/', '/boxers/page/2/', '/divisions/heavy/', '/sitemap/']) {
      expect((await gate.fetch(`https://boxingundefeated.com${path}`)).status).toBe(503)
    }
    expect(gate.serve).not.toHaveBeenCalled()
  })

  it('leaves pages that do not read D1 alone', async () => {
    const gate = setup(notReady)
    for (const path of ['/shop/page/2/', '/about/', '/ads.txt']) {
      expect((await gate.fetch(`https://boxingundefeated.com${path}`)).status).toBe(200)
    }
    expect(gate.runtime.datasetReadiness).not.toHaveBeenCalled()
  })

  it('serves and stores profiles once the import has finished', async () => {
    const gate = setup(notReady)
    await gate.fetch()
    gate.become(v1)

    expect((await gate.fetch()).headers.get(EDGE_CACHE_HEADER)).toBe('MISS')
    expect((await gate.fetch()).headers.get(EDGE_CACHE_HEADER)).toBe('HIT')
    expect(gate.serve).toHaveBeenCalledTimes(1)
  })

  it('stores nothing new during a re-import, but serves pages stored before it', async () => {
    const gate = setup(v1)
    await gate.fetch()
    gate.become(imported('v1', '2026-10-06 04:00:21.000', true))

    const stored = await gate.fetch()
    expect(stored.headers.get(EDGE_CACHE_HEADER)).toBe('HIT')
    expect(await stored.text()).toBe('render 1 of /boxers/len-wickwar/')

    const other = 'https://boxingundefeated.com/boxers/jesse-hart/'
    await gate.fetch(other)
    expect((await gate.fetch(other)).headers.get(EDGE_CACHE_HEADER)).toBe('MISS')
    expect(gate.cache.stored.size).toBe(1)
  })

  it('renders afresh under the new version once a re-import finishes', async () => {
    const gate = setup(v1)
    await gate.fetch()
    gate.become(imported('v2', '2026-10-06 05:00:00.000'))

    const response = await gate.fetch()
    expect(response.headers.get(EDGE_CACHE_HEADER)).toBe('MISS')
    expect(await response.text()).toBe('render 2 of /boxers/len-wickwar/')
  })

  it('never serves a page cached during a re-import once it finishes, even with the same version', async () => {
    // The importer has started, but this isolate's readiness is up to DATASET_STATE_TTL_MS old:
    // it still sees v1 as finished, so it stores a page rendered from half-imported data.
    const gate = setup(v1)
    const halfImported = await gate.fetch()
    expect(halfImported.headers.get(EDGE_CACHE_HEADER)).toBe('MISS')
    expect(gate.cache.stored.size).toBe(1)

    // The import finishes with the same data, so the same version, but a new generation.
    gate.become(imported('v1', '2026-10-06 04:30:00.000'))
    const response = await gate.fetch()
    expect(response.headers.get(EDGE_CACHE_HEADER)).toBe('MISS')
    expect(await response.text()).toBe('render 2 of /boxers/len-wickwar/')
    expect((await gate.fetch()).headers.get(EDGE_CACHE_HEADER)).toBe('HIT')
  })

  it('keys listings by the import generation too', async () => {
    const listing = 'https://boxingundefeated.com/divisions/heavy/page/2/'
    const gate = setup(v1)
    await gate.fetch(listing)
    expect((await gate.fetch(listing)).headers.get(EDGE_CACHE_HEADER)).toBe('HIT')

    gate.become(imported('v1', '2026-10-06 04:30:00.000'))
    expect((await gate.fetch(listing)).headers.get(EDGE_CACHE_HEADER)).toBe('MISS')
  })

  it('serves the last good copy while D1 is unreadable, and 503 without one', async () => {
    const gate = setup(v1)
    await gate.fetch()
    if (!v1.ready) throw new Error('v1 is ready')
    gate.become({
      ready: false,
      reason: 'dataset_state is unreadable: D1 is down',
      lastGeneration: v1.generation
    })

    const stale = await gate.fetch()
    expect(stale.status).toBe(200)
    expect(stale.headers.get(EDGE_CACHE_HEADER)).toBe('HIT')
    expect(await stale.text()).toBe('render 1 of /boxers/len-wickwar/')

    const uncached = await gate.fetch('https://boxingundefeated.com/boxers/jesse-hart/')
    expect(uncached.status).toBe(503)
    expect(uncached.headers.get('retry-after')).toBe('120')
    expect(gate.serve).toHaveBeenCalledTimes(1)
    expect(gate.cache.stored.size).toBe(1)
  })

  it('redirects a non-canonical host before reading D1', async () => {
    const gate = setup(notReady)
    const response = await gate.fetch(`${WWW}/boxers/len-wickwar/`)

    expect(response.status).toBe(308)
    expect(gate.runtime.datasetReadiness).not.toHaveBeenCalled()
  })
})

describe('handleWorkerRequest with the build guard', () => {
  const environments = { local, staging, production }
  const builds = ['local', 'staging', 'production'] as const

  it.each(
    builds.flatMap(built =>
      builds.filter(runtime => runtime !== built).map(runtime => [built, runtime] as const)
    )
  )('fails closed when a %s build runs as %s', async (built, runtime) => {
    for (const path of [...paths, '/robots.txt']) {
      const serve = serveSpy()
      const log = jest.fn()
      const response = await handleWorkerRequest(
        new Request(`https://boxingundefeated.com${path}`),
        environments[runtime],
        serve,
        { buildEnvironment: { siteEnvironment: built }, log }
      )

      expect(response.status).toBe(503)
      expect(response.headers.get('cache-control')).toBe('no-store')
      expect(response.headers.get('x-robots-tag')).toBe('noindex')
      expect(serve).not.toHaveBeenCalled()
      expect(log).toHaveBeenCalledWith({ event: 'build_environment_mismatch', built, runtime })
    }
  })

  it('fails closed before the host redirect', async () => {
    const response = await handleWorkerRequest(new Request(`${WWW}/`), production, serveSpy(), {
      buildEnvironment: { siteEnvironment: 'staging' }
    })

    expect(response.status).toBe(503)
  })

  it.each([{}, { siteEnvironment: 'prod' }])(
    'fails closed on a build record without a valid environment: %j',
    async record => {
      const serve = serveSpy()
      const response = await handleWorkerRequest(
        new Request('https://boxingundefeated.com/'),
        production,
        serve,
        { buildEnvironment: record as { siteEnvironment?: 'production'; commit?: string } }
      )

      expect(response.status).toBe(503)
      expect(serve).not.toHaveBeenCalled()
    }
  )

  it('fails closed when a production build runs without a SITE_ENVIRONMENT var', async () => {
    const response = await handleWorkerRequest(
      new Request('https://boxingundefeated.com/'),
      {},
      serveSpy(),
      { buildEnvironment: { siteEnvironment: 'production' } }
    )

    expect(response.status).toBe(503)
  })

  it.each(builds)('serves a %s build in its own environment', async environment => {
    const serve = serveSpy()
    const host = environment === 'local' ? 'http://localhost:8787' : 'https://boxingundefeated.com'
    const response = await handleWorkerRequest(
      new Request(`${host}/boxers/`),
      { ...environments[environment], CANONICAL_HOST_REDIRECT: 'off' },
      serve,
      { buildEnvironment: { siteEnvironment: environment } }
    )

    expect(response.status).toBe(200)
    expect(serve).toHaveBeenCalledTimes(1)
  })
})

describe('handleWorkerRequest build commit header', () => {
  const buildEnvironment = { siteEnvironment: 'production' as const, commit: 'abc123' }
  const smoke = { [SMOKE_TEST_HEADER]: '1' }

  it.each([
    ['a page', 'https://boxingundefeated.com/boxers/', 200],
    ['a workers.dev page', `${WORKERS_DEV}/boxers/`, 200],
    ['a slashless page', 'https://boxingundefeated.com/boxers', 200]
  ])('names the commit on a smoke-test request for %s', async (_, url, status) => {
    const response = await handleWorkerRequest(
      new Request(url, { headers: smoke }),
      production,
      serveSpy(),
      { buildEnvironment }
    )

    expect(response.status).toBe(status)
    expect(response.headers.get(BUILD_COMMIT_HEADER)).toBe('abc123')
  })

  it('names the commit on the build guard 503 too', async () => {
    const response = await handleWorkerRequest(
      new Request('https://boxingundefeated.com/', { headers: smoke }),
      staging,
      serveSpy(),
      { buildEnvironment }
    )

    expect(response.status).toBe(503)
    expect(response.headers.get(BUILD_COMMIT_HEADER)).toBe('abc123')
  })

  it('leaves it off requests without the smoke-test header', async () => {
    for (const url of ['https://boxingundefeated.com/boxers/', `${WWW}/`]) {
      const response = await handleWorkerRequest(new Request(url), production, serveSpy(), {
        buildEnvironment
      })

      expect(response.headers.get(BUILD_COMMIT_HEADER)).toBeNull()
    }
  })
})
