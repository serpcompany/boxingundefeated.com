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
const staging = {
  SITE_ENVIRONMENT: 'staging',
  CANONICAL_HOST_REDIRECT: 'on',
  STAGING_BASIC_AUTH_PASSWORD: 'stagingpassword'
}
const local = { SITE_ENVIRONMENT: 'local', CANONICAL_HOST_REDIRECT: 'off' }

const WWW = 'https://www.boxingundefeated.com'
const WORKERS_DEV = 'https://boxingundefeated-com-production.serp.workers.dev'
const STAGING_WORKERS_DEV = 'https://boxingundefeated-com-staging.serp.workers.dev'
const STAGING = 'https://staging.boxingundefeated.com'

/** Staging's password, as a browser or an auditor sends it (any username). */
const PASSWORD = { authorization: `Basic ${btoa('staging:stagingpassword')}` }
const SMOKE = { [SMOKE_TEST_HEADER]: '1' }

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

    // Staging's robots.txt is the one app/robots.ts rendered for the staging build.
    const serve = serveSpy()
    const robots = await handleWorkerRequest(
      new Request(`${STAGING_WORKERS_DEV}/robots.txt`, { headers }),
      staging,
      serve
    )
    expect(await robots.text()).toBe('served')
    expect(robots.headers.get('x-robots-tag')).toBe('noindex')
    expect(serve).toHaveBeenCalledTimes(1)
  })

  it('answers robots.txt itself with Disallow on a local Worker', async () => {
    const serve = serveSpy()
    const robots = await handleWorkerRequest(
      new Request('http://localhost:8787/robots.txt'),
      local,
      serve
    )
    expect(await robots.text()).toBe('User-agent: *\nDisallow: /\n')
    expect(robots.headers.get('x-robots-tag')).toBe('noindex')
    expect(serve).not.toHaveBeenCalled()
  })

  it('serves a local Worker on any host, with noindex', async () => {
    const serve = serveSpy()
    const response = await handleWorkerRequest(new Request(`${WORKERS_DEV}/ads.txt`), local, serve)

    expect(response.status).toBe(200)
    expect(response.headers.get('x-robots-tag')).toBe('noindex')
    expect(serve).toHaveBeenCalledTimes(1)
  })
})

describe('handleWorkerRequest for a shop path with non-ASCII letters', () => {
  const ORIGIN = 'https://boxingundefeated.com'
  const PAGE = '/shop/best/br%C3%BCmate-water-bottles/'

  it.each([
    ['/shop/best/br%C3%BCmate-water-bottles', 'no slash'],
    ['/shop/best/br%c3%bcmate-water-bottles/', 'lowercase hex, as workerd passes raw UTF-8 on'],
    ['/shop/best/bru%CC%88mate-water-bottles/', 'NFD'],
    ['/shop/best/bru%CC%88mate-water-bottles', 'NFD, no slash'],
    ['/shop/best/br~C3~BCmate-water-bottles/', 'its route key']
  ])('answers %s (%s) with one 308 to the canonical spelling', async path => {
    for (const [env, robots] of [
      [production, null],
      [local, 'noindex']
    ] as const) {
      const serve = serveSpy()
      const response = await handleWorkerRequest(new Request(`${ORIGIN}${path}?q=1`), env, serve)

      expect(response.status).toBe(308)
      expect(response.headers.get('location')).toBe(`${PAGE}?q=1`)
      expect(response.headers.get('x-robots-tag')).toBe(robots)
      expect(serve).not.toHaveBeenCalled()
    }
  })

  it.each([
    ['/shop//best/br%C3%BCmate-water-bottles/', PAGE],
    ['/shop//best/br%C3%BCmate-water-bottles', PAGE],
    ['//shop/best/bru%CC%88mate-water-bottles', PAGE],
    ['/shop/best//nestl%C3%A9-water-bottles/', '/shop/best/nestl%C3%A9-water-bottles/'],
    ['/shop/best//nestl%C3%A9-water-bottles', '/shop/best/nestl%C3%A9-water-bottles/']
  ])('answers %s, with repeated slashes, with one 308 to %s', async (path, location) => {
    const serve = serveSpy()
    const response = await handleWorkerRequest(new Request(`${ORIGIN}${path}`), production, serve)

    expect(response.status).toBe(308)
    expect(response.headers.get('location')).toBe(location)
    expect(serve).not.toHaveBeenCalled()
  })

  it('renders the canonical spelling from its route key, query and headers kept', async () => {
    const serve = serveSpy()
    const response = await handleWorkerRequest(
      new Request(`${ORIGIN}${PAGE}?_rsc=1`, { headers: { rsc: '1' } }),
      production,
      serve
    )

    expect(response.status).toBe(200)
    expect(serve).toHaveBeenCalledTimes(1)
    const [rendered] = serve.mock.calls[0] as unknown as [Request]
    expect(rendered.url).toBe(`${ORIGIN}/shop/best/br~C3~BCmate-water-bottles/?_rsc=1`)
    expect(rendered.headers.get('rsc')).toBe('1')
  })

  it.each(['/shop/best/fuelmate-water-bottles', '/shop//best/fuelmate-water-bottles/'])(
    'leaves the ASCII shop path %s to OpenNext as sent',
    async path => {
      const serve = serveSpy()
      const request = new Request(`${ORIGIN}${path}`)
      const response = await handleWorkerRequest(request, production, serve)

      expect(response.status).toBe(200)
      expect(serve).toHaveBeenCalledWith(request)
    }
  )
})

describe('handleWorkerRequest for a retired path', () => {
  const ORIGIN = 'https://boxingundefeated.com'
  const version = { CF_VERSION_METADATA: { id: 'version-1' } }
  const retired = ['/blog/', '/blog', '/blog/jab/', '/blog/x/', '/brands/', '/brands', '/brands/x/']

  function runtime() {
    const cache = new MemoryCache()
    const openCache = jest.fn(async () => cache as unknown as Cache)
    const datasetReadiness = jest.fn(
      async (): Promise<DatasetReadiness> => ({ ready: false, reason: 'not read' })
    )
    return {
      openCache,
      datasetReadiness,
      runtime: {
        edgeCache: { context: { waitUntil: () => {} }, openCache },
        datasetReadiness,
        searchApi: jest.fn(),
        sitemaps: jest.fn()
      } satisfies WorkerRuntime
    }
  }

  function expectGone(response: Response, robots = 'noindex') {
    expect(response.status).toBe(410)
    expect(response.headers.get('location')).toBeNull()
    expect(response.headers.get('content-type')).toBe('text/html; charset=utf-8')
    expect(response.headers.get('cache-control')).toBe('no-store')
    expect(response.headers.get('x-robots-tag')).toBe(robots)
    expect(response.headers.get(EDGE_CACHE_HEADER)).toBeNull()
  }

  it.each(retired)(
    'answers %s with 410 in production, without a redirect, the edge cache, D1 or OpenNext',
    async path => {
      const serve = serveSpy()
      const edge = runtime()
      // Twice: the second is not served from the edge cache either.
      for (const _attempt of [1, 2]) {
        const response = await handleWorkerRequest(
          new Request(`${ORIGIN}${path}`),
          { ...production, ...version },
          serve,
          edge.runtime
        )
        expectGone(response)
        expect(await response.text()).toContain('<a href="/">')
      }
      expect(serve).not.toHaveBeenCalled()
      expect(edge.openCache).not.toHaveBeenCalled()
      expect(edge.datasetReadiness).not.toHaveBeenCalled()
    }
  )

  it('answers HEAD with the same status and headers, and no body', async () => {
    const response = await handleWorkerRequest(
      new Request(`${ORIGIN}/brands/`, { method: 'HEAD' }),
      production,
      serveSpy()
    )
    expectGone(response)
    expect(await response.text()).toBe('')
  })

  it.each([
    [WWW, '/blog', '/blog/'],
    [WWW, '/blog/', '/blog/'],
    [WWW, '/brands', '/brands/'],
    [WORKERS_DEV, '/brands/x', '/brands/x/']
  ])('sends %s%s to the canonical host first, in one 308 to %s', async (host, path, to) => {
    const serve = serveSpy()
    const response = await handleWorkerRequest(new Request(`${host}${path}`), production, serve)

    expect(response.status).toBe(308)
    expect(response.headers.get('location')).toBe(`${ORIGIN}${to}`)
    expect(serve).not.toHaveBeenCalled()
  })

  it('answers a smoke-test request on workers.dev with the 410', async () => {
    const response = await handleWorkerRequest(
      new Request(`${WORKERS_DEV}/blog`, { headers: SMOKE }),
      production,
      serveSpy()
    )
    expectGone(response)
  })

  it("asks for staging's password first, then answers 410 with noindex", async () => {
    const refused = await handleWorkerRequest(new Request(`${STAGING}/blog/`), staging, serveSpy())
    expect(refused.status).toBe(401)

    for (const headers of [PASSWORD, SMOKE]) {
      const serve = serveSpy()
      const response = await handleWorkerRequest(
        new Request(`${STAGING}/brands`, { headers }),
        staging,
        serve
      )
      // Its own noindex: the crawl policy adds none for a request with the password.
      expectGone(response)
      expect(serve).not.toHaveBeenCalled()
    }

    const fromWorkersDev = await handleWorkerRequest(
      new Request(`${STAGING_WORKERS_DEV}/blog`, { headers: PASSWORD }),
      staging,
      serveSpy()
    )
    expect(fromWorkersDev.status).toBe(308)
    expect(fromWorkersDev.headers.get('location')).toBe(`${STAGING}/blog/`)
  })

  it('answers it on a local Worker too', async () => {
    expectGone(
      await handleWorkerRequest(new Request('http://localhost:8787/blog'), local, serveSpy())
    )
  })

  it.each(['/blogs/', '/Blog/', '/brand/', '/shop/best/blog/', '/no-such-page/'])(
    'leaves %s to OpenNext, which answers an unknown path with 404',
    async path => {
      const serve = serveSpy()
      const request = new Request(`${ORIGIN}${path}`)
      const response = await handleWorkerRequest(request, production, serve)

      expect(response.status).toBe(200)
      expect(serve).toHaveBeenCalledWith(request)
    }
  )
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

  async function fetchTwice(
    url: string,
    env: object,
    serve: ReturnType<typeof pageSpy>,
    headers: Record<string, string> = {}
  ) {
    const edge = edgeCache()
    const first = await handleWorkerRequest(
      new Request(url, { headers }),
      { ...env, ...version },
      serve,
      edge.runtime
    )
    await edge.settle()
    const second = await handleWorkerRequest(
      new Request(url, { headers }),
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
      serve,
      SMOKE
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

  it('answers the local robots.txt before the cache', async () => {
    const edge = edgeCache()
    const serve = pageSpy()
    const response = await handleWorkerRequest(
      new Request('http://localhost:8787/robots.txt'),
      { ...local, ...version },
      serve,
      edge.runtime
    )

    expect(await response.text()).toMatch(/^Disallow: \/$/m)
    expect(edge.openCache).not.toHaveBeenCalled()
    expect(serve).not.toHaveBeenCalled()
  })

  it("never caches staging's robots.txt, and serves it without the password", async () => {
    const edge = edgeCache()
    const robots = new Response('User-Agent: *\nDisallow: /\n', {
      headers: { 'content-type': 'text/plain' }
    })
    const serve = jest.fn((_request: Request) => Promise.resolve(robots))
    const response = await handleWorkerRequest(
      new Request(`${STAGING}/robots.txt`),
      { ...staging, ...version },
      serve,
      edge.runtime
    )

    expect(response.status).toBe(200)
    expect(await response.text()).toBe('User-Agent: *\nDisallow: /\n')
    expect(response.headers.get('x-robots-tag')).toBe('noindex')
    expect(edge.openCache).not.toHaveBeenCalled()
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

  it('caches a shop page with non-ASCII letters under the URL requested, rendered from its route key', async () => {
    const serve = pageSpy()
    const { edge, first, second } = await fetchTwice(
      'https://boxingundefeated.com/shop/best/nestl%C3%A9-water-bottles/',
      production,
      serve
    )

    expect(first.headers.get(EDGE_CACHE_HEADER)).toBe('MISS')
    expect(second.headers.get(EDGE_CACHE_HEADER)).toBe('HIT')
    expect(await second.text()).toBe('page /shop/best/nestl~C3~A9-water-bottles/')
    expect(serve).toHaveBeenCalledTimes(1)
    expect([...edge.cache.stored.keys()].join()).toContain('/shop/best/nestl%C3%A9-water-bottles/')
  })

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

describe("handleWorkerRequest with a D1 page's notFound()", () => {
  const version = { CF_VERSION_METADATA: { id: 'version-1' } }
  const HTML = 'text/html; charset=utf-8'
  const NO_STORE = 'private, no-cache, no-store, max-age=0, must-revalidate'
  const ERROR_SHELL = '<!DOCTYPE html><html id="__next_error__"><head></head><body></body></html>'
  const NOT_FOUND_PAGE =
    '<!DOCTYPE html><html lang="en"><body><h1>Page Not Found</h1></body></html>'

  /**
   * OpenNext as the Worker sees it: a known boxer is a 200 page, `/_not-found` the prerendered
   * not-found page, an RSC request an RSC 404, and any other page `notFound()`'s empty document.
   */
  function openNext() {
    return jest.fn(async (request: Request) => {
      const { pathname } = new URL(request.url)
      const body = (text: string) => (request.method === 'HEAD' ? null : text)
      if (pathname === '/boxers/len-wickwar/') {
        return new Response(body('Len Wickwar'), { headers: { 'content-type': HTML } })
      }
      if (request.headers.has('rsc')) {
        return new Response(body('1:"$Sreact.fragment"'), {
          status: 404,
          headers: { 'content-type': 'text/x-component' }
        })
      }
      if (pathname === '/_not-found') {
        return new Response(body(NOT_FOUND_PAGE), {
          status: 404,
          headers: { 'content-type': HTML }
        })
      }
      return new Response(body(ERROR_SHELL), {
        status: 404,
        headers: { 'content-type': HTML, 'cache-control': NO_STORE }
      })
    })
  }

  function edgeCache() {
    const cache = new MemoryCache()
    const pending: Promise<unknown>[] = []
    return {
      cache,
      runtime: {
        edgeCache: {
          context: { waitUntil: (promise: Promise<unknown>) => void pending.push(promise) },
          openCache: async () => cache as unknown as Cache
        }
      } satisfies WorkerRuntime,
      settle: () => Promise.all(pending.splice(0))
    }
  }

  const renderedPaths = (serve: ReturnType<typeof openNext>) =>
    serve.mock.calls.map(([request]) => new URL(request.url).pathname)

  it.each([
    'https://boxingundefeated.com/boxers/no-such-boxer/',
    'https://boxingundefeated.com/boxers/page/999/',
    'https://boxingundefeated.com/divisions/nope/',
    'https://boxingundefeated.com/divisions/heavy/page/999/'
  ])('answers %s with the full not-found page, a 404, never stored', async url => {
    const serve = openNext()
    const edge = edgeCache()
    for (const _ of [1, 2]) {
      const response = await handleWorkerRequest(
        new Request(url),
        { ...production, ...version },
        serve,
        edge.runtime
      )
      await edge.settle()

      expect(response.status).toBe(404)
      expect(await response.text()).toBe(NOT_FOUND_PAGE)
      expect(response.headers.get('content-type')).toBe(HTML)
      expect(response.headers.get('cache-control')).toBe(NO_STORE)
      expect(response.headers.get(EDGE_CACHE_HEADER)).toBe('MISS')
      expect(response.headers.get('x-robots-tag')).toBeNull()
    }
    expect(edge.cache.stored.size).toBe(0)
    const path = new URL(url).pathname
    expect(renderedPaths(serve)).toEqual([path, '/_not-found', path, '/_not-found'])
  })

  it('serves it on staging only behind the password, with noindex for a smoke test', async () => {
    const url = `${STAGING}/boxers/no-such-boxer/`
    const serve = openNext()

    const refused = await handleWorkerRequest(new Request(url), staging, serve)
    expect(refused.status).toBe(401)
    expect(await refused.text()).not.toContain('Page Not Found')
    expect(serve).not.toHaveBeenCalled()

    for (const [headers, robots] of [
      [PASSWORD, null],
      [SMOKE, 'noindex']
    ] as const) {
      const response = await handleWorkerRequest(new Request(url, { headers }), staging, serve)

      expect(response.status).toBe(404)
      expect(await response.text()).toBe(NOT_FOUND_PAGE)
      expect(response.headers.get('x-robots-tag')).toBe(robots)
    }
    const notFound = serve.mock.calls.find(([request]) => request.url.endsWith('/_not-found'))
    expect(notFound?.[0].headers.has('authorization')).toBe(false)
  })

  it('serves it on a local Worker with noindex', async () => {
    const response = await handleWorkerRequest(
      new Request('http://localhost:8787/boxers/no-such-boxer/'),
      local,
      openNext()
    )

    expect(response.status).toBe(404)
    expect(await response.text()).toBe(NOT_FOUND_PAGE)
    expect(response.headers.get('x-robots-tag')).toBe('noindex')
  })

  it('answers HEAD with the same status and headers as GET, and no body', async () => {
    const url = 'https://boxingundefeated.com/boxers/no-such-boxer/'
    const serve = openNext()
    const get = await handleWorkerRequest(new Request(url), production, serve)
    const head = await handleWorkerRequest(new Request(url, { method: 'HEAD' }), production, serve)

    expect(head.status).toBe(get.status)
    expect([...head.headers]).toEqual([...get.headers])
    expect(await head.text()).toBe('')
    expect(renderedPaths(serve)).toEqual([
      '/boxers/no-such-boxer/',
      '/_not-found',
      '/boxers/no-such-boxer/'
    ])
  })

  it("passes a client-side navigation's RSC 404 through, so the browser shows the not-found page", async () => {
    const serve = openNext()
    const edge = edgeCache()
    const response = await handleWorkerRequest(
      new Request('https://boxingundefeated.com/boxers/no-such-boxer/?_rsc=abc', {
        headers: { rsc: '1', 'next-router-state-tree': '%5B%22%22%5D' }
      }),
      { ...production, ...version },
      serve,
      edge.runtime
    )
    await edge.settle()

    expect(response.status).toBe(404)
    expect(response.headers.get('content-type')).toBe('text/x-component')
    expect(await response.text()).toBe('1:"$Sreact.fragment"')
    expect(renderedPaths(serve)).toEqual(['/boxers/no-such-boxer/'])
    expect(edge.cache.stored.size).toBe(0)
  })

  it('leaves a known page, and pages that do not read D1, as OpenNext answers them', async () => {
    const serve = openNext()
    const page = await handleWorkerRequest(
      new Request('https://boxingundefeated.com/boxers/len-wickwar/'),
      production,
      serve
    )
    expect(page.status).toBe(200)
    expect(await page.text()).toBe('Len Wickwar')

    // Unmatched URLs get the not-found page from OpenNext itself; this one is the empty document.
    for (const path of ['/no-such-page/', '/shop/best/nope/', '/boxers/a/b/']) {
      const response = await handleWorkerRequest(
        new Request(`https://boxingundefeated.com${path}`),
        production,
        serve
      )
      expect(response.status).toBe(404)
      expect(await response.text()).toBe(ERROR_SHELL)
    }
    expect(renderedPaths(serve)).not.toContain('/_not-found')
  })

  it('leaves /api/search, the XML sitemaps and redirects alone', async () => {
    const serve = openNext()
    const notFound = (type: string) =>
      jest.fn(
        async () => new Response(ERROR_SHELL, { status: 404, headers: { 'content-type': type } })
      )
    const runtime = { searchApi: notFound(HTML), sitemaps: notFound(HTML) }

    for (const path of [
      '/api/search?q=x',
      '/api/search/?q=x',
      '/sitemap-nope.xml',
      '/sitemap.xml'
    ]) {
      const response = await handleWorkerRequest(
        new Request(`https://boxingundefeated.com${path}`),
        production,
        serve,
        runtime
      )
      expect(response.status).toBe(404)
      expect(await response.text()).toBe(ERROR_SHELL)
    }
    const redirect = await handleWorkerRequest(
      new Request('https://www.boxingundefeated.com/boxers/no-such-boxer/'),
      production,
      serve
    )
    expect(redirect.status).toBe(308)
    expect(serve).not.toHaveBeenCalled()
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
    const response = await gate.fetch('http://localhost:8787/boxers/x/', local)

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

describe("handleWorkerRequest with staging's password", () => {
  const version = { CF_VERSION_METADATA: { id: 'version-1' } }
  const gatedPaths = [...paths, '/robots.txt/', '/sitemap.xml', '/api/search?q=ali', '/boxers']

  it.each([
    ['no password', {}],
    ['a wrong password', { authorization: `Basic ${btoa('staging:wrong')}` }],
    ['a malformed header', { authorization: 'Bearer stagingpassword' }]
  ])(
    'answers 401 on every staging host with %s, before the redirect and OpenNext',
    async (_, headers) => {
      for (const host of [STAGING, STAGING_WORKERS_DEV]) {
        for (const path of gatedPaths) {
          const serve = serveSpy()
          const response = await handleWorkerRequest(
            new Request(`${host}${path}`, { headers }),
            staging,
            serve
          )

          expect(response.status).toBe(401)
          expect(response.headers.get('www-authenticate')).toBe(
            'Basic realm="boxingundefeated.com staging", charset="UTF-8"'
          )
          expect(response.headers.get('cache-control')).toBe('no-store')
          expect(response.headers.get('x-robots-tag')).toBe('noindex')
          expect(response.headers.get('location')).toBeNull()
          expect(serve).not.toHaveBeenCalled()
        }
      }
    }
  )

  it('serves the password on the staging host without noindex or the Authorization header', async () => {
    for (const username of ['staging', '', 'AhrefsSiteAudit']) {
      const serve = serveSpy()
      const response = await handleWorkerRequest(
        new Request(`${STAGING}/boxers/len-wickwar/`, {
          headers: { authorization: `Basic ${btoa(`${username}:stagingpassword`)}` }
        }),
        staging,
        serve
      )

      expect(response.status).toBe(200)
      expect(response.headers.get('x-robots-tag')).toBeNull()
      expect(response.headers.get('www-authenticate')).toBeNull()
      expect(serve).toHaveBeenCalledTimes(1)
      const served = serve.mock.calls[0] as unknown as [Request]
      expect(served[0].headers.has('authorization')).toBe(false)
    }
  })

  it('sends the password on the staging workers.dev host on to the canonical host', async () => {
    const serve = serveSpy()
    const response = await handleWorkerRequest(
      new Request(`${STAGING_WORKERS_DEV}/about`, { headers: PASSWORD }),
      staging,
      serve
    )

    expect(response.status).toBe(308)
    expect(response.headers.get('location')).toBe(`${STAGING}/about/`)
    expect(serve).not.toHaveBeenCalled()
  })

  it('asks for the password before the 308 of a shop path with non-ASCII letters', async () => {
    const page = '/shop/best/br%C3%BCmate-water-bottles/'
    for (const path of [page, '/shop/best/bru%CC%88mate-water-bottles']) {
      const serve = serveSpy()
      const refused = await handleWorkerRequest(new Request(`${STAGING}${path}`), staging, serve)
      expect(refused.status).toBe(401)
      expect(refused.headers.get('location')).toBeNull()
      expect(serve).not.toHaveBeenCalled()
    }

    for (const [headers, robots] of [
      [PASSWORD, null],
      [SMOKE, 'noindex']
    ] as const) {
      const serve = serveSpy()
      const redirected = await handleWorkerRequest(
        new Request(`${STAGING}/shop/best/bru%CC%88mate-water-bottles`, { headers }),
        staging,
        serve
      )
      expect(redirected.status).toBe(308)
      expect(redirected.headers.get('location')).toBe(page)
      expect(redirected.headers.get('x-robots-tag')).toBe(robots)
      expect(serve).not.toHaveBeenCalled()

      const rendered = await handleWorkerRequest(
        new Request(`${STAGING}${page}`, { headers }),
        staging,
        serve
      )
      expect(rendered.status).toBe(200)
      expect(rendered.headers.get('x-robots-tag')).toBe(robots)
      const [served] = serve.mock.calls[0] as unknown as [Request]
      expect(served.url).toBe(`${STAGING}/shop/best/br~C3~BCmate-water-bottles/`)
      expect(served.headers.has('authorization')).toBe(false)
    }
  })

  it('serves smoke-test requests without the password, and keeps their noindex with it', async () => {
    for (const headers of [SMOKE, { ...SMOKE, ...PASSWORD }]) {
      for (const host of [STAGING, STAGING_WORKERS_DEV]) {
        const serve = serveSpy()
        const response = await handleWorkerRequest(
          new Request(`${host}/boxers/`, { headers }),
          staging,
          serve
        )

        expect(response.status).toBe(200)
        expect(response.headers.get('x-robots-tag')).toBe('noindex')
        expect(serve).toHaveBeenCalledTimes(1)
      }
    }
  })

  it('serves robots.txt without the password, noindex, and redirects it from workers.dev', async () => {
    for (const headers of [{}, PASSWORD]) {
      const serve = serveSpy()
      const response = await handleWorkerRequest(
        new Request(`${STAGING}/robots.txt`, { headers }),
        staging,
        serve
      )
      expect(response.status).toBe(200)
      expect(response.headers.get('x-robots-tag')).toBe('noindex')
      expect(serve).toHaveBeenCalledTimes(1)
    }

    const redirected = await handleWorkerRequest(
      new Request(`${STAGING_WORKERS_DEV}/robots.txt`),
      staging,
      serveSpy()
    )
    expect(redirected.status).toBe(308)
    expect(redirected.headers.get('location')).toBe(`${STAGING}/robots.txt`)
  })

  it('fails closed without the password var: only the exemptions are served', async () => {
    const { STAGING_BASIC_AUTH_PASSWORD: _, ...unset } = staging
    for (const env of [unset, { ...unset, STAGING_BASIC_AUTH_PASSWORD: '' }]) {
      for (const headers of [{}, PASSWORD, { authorization: `Basic ${btoa('staging:')}` }]) {
        const response = await handleWorkerRequest(
          new Request(`${STAGING}/`, { headers }),
          env,
          serveSpy()
        )
        expect(response.status).toBe(401)
      }
      const robots = await handleWorkerRequest(
        new Request(`${STAGING}/robots.txt`),
        env,
        serveSpy()
      )
      expect(robots.status).toBe(200)
      const smoke = await handleWorkerRequest(
        new Request(`${STAGING}/`, { headers: SMOKE }),
        env,
        serveSpy()
      )
      expect(smoke.status).toBe(200)
    }
  })

  it('never asks production or a local Worker for a password', async () => {
    const cases: Array<[string, object]> = [
      ['https://boxingundefeated.com', production],
      ['https://boxingundefeated.com', { ...production, STAGING_BASIC_AUTH_PASSWORD: 'x' }],
      ['http://localhost:8787', local],
      ['http://localhost:8787', { ...local, STAGING_BASIC_AUTH_PASSWORD: 'x' }]
    ]
    for (const [host, env] of cases) {
      for (const path of paths) {
        for (const headers of [{}, { authorization: `Basic ${btoa('staging:wrong')}` }]) {
          const response = await handleWorkerRequest(
            new Request(`${host}${path}`, { headers }),
            env,
            serveSpy()
          )
          expect(response.status).toBe(200)
          expect(response.headers.get('www-authenticate')).toBeNull()
        }
      }
    }
  })

  it('caches a page for the password like an anonymous one, and never across the gate', async () => {
    const cache = new MemoryCache()
    const pending: Promise<unknown>[] = []
    const openCache = jest.fn(async () => cache as unknown as Cache)
    const runtime: WorkerRuntime = {
      edgeCache: {
        context: { waitUntil: (promise: Promise<unknown>) => void pending.push(promise) },
        openCache
      }
    }
    const serve = jest.fn((request: Request) =>
      Promise.resolve(
        new Response(`page ${new URL(request.url).pathname}`, {
          headers: { 'content-type': 'text/html; charset=utf-8' }
        })
      )
    )
    const fetch = async (headers: Record<string, string>) => {
      const response = await handleWorkerRequest(
        new Request(`${STAGING}/boxers/`, { headers }),
        { ...staging, ...version },
        serve,
        runtime
      )
      await Promise.all(pending.splice(0))
      return response
    }

    const refused = await fetch({})
    expect(refused.status).toBe(401)
    expect(refused.headers.has(EDGE_CACHE_HEADER)).toBe(false)
    expect(openCache).not.toHaveBeenCalled()

    const first = await fetch(PASSWORD)
    expect(first.headers.get(EDGE_CACHE_HEADER)).toBe('MISS')
    expect(cache.stored.size).toBe(1)
    const second = await fetch(PASSWORD)
    expect(second.headers.get(EDGE_CACHE_HEADER)).toBe('HIT')
    expect(second.headers.get('x-robots-tag')).toBeNull()
    expect(serve).toHaveBeenCalledTimes(1)

    // The copy stored for the password: still 401 without it, still noindex for a smoke test.
    const after = await fetch({})
    expect(after.status).toBe(401)
    expect(await after.text()).not.toContain('page')
    const smoke = await fetch(SMOKE)
    expect(smoke.headers.get(EDGE_CACHE_HEADER)).toBe('HIT')
    expect(smoke.headers.get('x-robots-tag')).toBe('noindex')
    expect(serve).toHaveBeenCalledTimes(1)
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
      new Request(`${host}/boxers/`, { headers: PASSWORD }),
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
