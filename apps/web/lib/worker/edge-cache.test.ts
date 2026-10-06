/**
 * @jest-environment node
 */
import {
  EDGE_CACHE_HEADER,
  EDGE_CACHE_TTL_SECONDS,
  type EdgeCacheOptions,
  withEdgeCache
} from './edge-cache'
import { MemoryCache } from './memory-cache'

const NEXT_DYNAMIC_CACHE_CONTROL = 'private, no-cache, no-store, max-age=0, must-revalidate'
const HTML = { 'content-type': 'text/html; charset=utf-8' }

function setup(overrides: Partial<EdgeCacheOptions> = {}) {
  const cache = new MemoryCache()
  const openCache = jest.fn(async () => cache as unknown as Cache)
  const pending: Promise<unknown>[] = []
  const context = { waitUntil: (promise: Promise<unknown>) => void pending.push(promise) }
  const rendered: Request[] = []
  let status = 200
  let headers: Record<string, string> = { ...HTML, 'cache-control': NEXT_DYNAMIC_CACHE_CONTROL }
  const render = jest.fn(async (request: Request) => {
    rendered.push(request)
    return new Response(`<h1>${new URL(request.url).pathname} #${rendered.length}</h1>`, {
      status,
      headers
    })
  })
  const options: EdgeCacheOptions = { openCache, deploymentId: 'version-1', ...overrides }
  return {
    cache,
    openCache,
    rendered,
    render,
    respondWith(nextStatus: number, nextHeaders: Record<string, string> = HTML) {
      status = nextStatus
      headers = nextHeaders
    },
    async fetch(input: string | Request, fetchOptions: Partial<EdgeCacheOptions> = {}) {
      const request =
        typeof input === 'string' ? new Request(`https://boxingundefeated.com${input}`) : input
      const response = await withEdgeCache(
        request,
        context,
        { ...options, ...fetchOptions },
        render
      )
      await Promise.all(pending.splice(0))
      return response
    }
  }
}

describe('withEdgeCache', () => {
  it('renders a page once, then serves the stored copy without rendering', async () => {
    const edge = setup()

    const miss = await edge.fetch('/boxers/jesse-hart/')
    expect(miss.headers.get(EDGE_CACHE_HEADER)).toBe('MISS')
    expect(await miss.text()).toBe('<h1>/boxers/jesse-hart/ #1</h1>')

    const hit = await edge.fetch('/boxers/jesse-hart/')
    expect(hit.headers.get(EDGE_CACHE_HEADER)).toBe('HIT')
    expect(await hit.text()).toBe('<h1>/boxers/jesse-hart/ #1</h1>')
    expect(edge.render).toHaveBeenCalledTimes(1)
  })

  it('stores a copy for the TTL and gives visitors the original cache-control', async () => {
    const edge = setup()
    await edge.fetch('/boxers/jesse-hart/')

    const [stored] = [...edge.cache.stored.values()]
    expect(stored?.headers.get('cache-control')).toBe(`public, max-age=${EDGE_CACHE_TTL_SECONDS}`)
    const hit = await edge.fetch('/boxers/jesse-hart/')
    expect(hit.headers.get('cache-control')).toBe(NEXT_DYNAMIC_CACHE_CONTROL)
    expect(hit.headers.has('x-edge-cache-origin-cache-control')).toBe(false)
  })

  it('stores RSC payloads of pages as well as HTML', async () => {
    const edge = setup()
    edge.respondWith(200, { 'content-type': 'text/x-component' })
    const rsc = () =>
      new Request('https://boxingundefeated.com/boxers/jesse-hart/?_rsc=abc', {
        headers: { rsc: '1' }
      })
    await edge.fetch(rsc())

    expect((await edge.fetch(rsc())).headers.get(EDGE_CACHE_HEADER)).toBe('HIT')
  })

  it('keys by Worker version, so a deploy renders afresh', async () => {
    const edge = setup()
    await edge.fetch('/boxers/jesse-hart/')

    const afterDeploy = await edge.fetch('/boxers/jesse-hart/', { deploymentId: 'version-2' })
    expect(afterDeploy.headers.get(EDGE_CACHE_HEADER)).toBe('MISS')
    expect(edge.render).toHaveBeenCalledTimes(2)
  })

  it('keys by host, path, query and RSC variant', async () => {
    const edge = setup()
    await edge.fetch('/boxers/jesse-hart/')

    const others = [
      new Request('https://staging.boxingundefeated.com/boxers/jesse-hart/'),
      new Request('https://boxingundefeated.com/boxers/ema-kozin/'),
      new Request('https://boxingundefeated.com/boxers/jesse-hart/?_rsc=abc'),
      new Request('https://boxingundefeated.com/boxers/jesse-hart/', { headers: { rsc: '1' } }),
      new Request('https://boxingundefeated.com/boxers/jesse-hart/', {
        headers: { rsc: '1', 'next-router-prefetch': '1' }
      })
    ]
    for (const request of others) {
      expect((await edge.fetch(request)).headers.get(EDGE_CACHE_HEADER)).toBe('MISS')
    }
    expect(edge.render).toHaveBeenCalledTimes(1 + others.length)
  })

  it('shares one copy across tracking parameters, but not other query parameters', async () => {
    const edge = setup()
    await edge.fetch('/boxers/jesse-hart/?utm_source=x&utm_campaign=y')

    for (const query of ['', '?gclid=1', '?fbclid=2', '?msclkid=3', '?ref=4', '?utm_medium=z']) {
      const response = await edge.fetch(`/boxers/jesse-hart/${query}`)
      expect(response.headers.get(EDGE_CACHE_HEADER)).toBe('HIT')
    }
    expect((await edge.fetch('/boxers/jesse-hart/?page=2')).headers.get(EDGE_CACHE_HEADER)).toBe(
      'MISS'
    )
    expect(
      (await edge.fetch('/boxers/jesse-hart/?page=2&utm_source=x')).headers.get(EDGE_CACHE_HEADER)
    ).toBe('HIT')
  })

  it('renders a page without tracking parameters, keeping the rest of the query', async () => {
    const edge = setup()
    await edge.fetch('/boxers/jesse-hart/?utm_source=x&page=2&gclid=1')

    expect(edge.rendered[0]?.url).toBe('https://boxingundefeated.com/boxers/jesse-hart/?page=2')
  })

  it('keys by dataset version', async () => {
    const edge = setup({ dataVersion: 'v1' })
    await edge.fetch('/boxers/jesse-hart/')

    expect((await edge.fetch('/boxers/jesse-hart/')).headers.get(EDGE_CACHE_HEADER)).toBe('HIT')
    const next = await edge.fetch('/boxers/jesse-hart/', { dataVersion: 'v2' })
    expect(next.headers.get(EDGE_CACHE_HEADER)).toBe('MISS')
  })

  it('serves stored pages but stores nothing new when told not to', async () => {
    const edge = setup()
    await edge.fetch('/boxers/jesse-hart/')

    const hit = await edge.fetch('/boxers/jesse-hart/', { store: false })
    expect(hit.headers.get(EDGE_CACHE_HEADER)).toBe('HIT')
    await edge.fetch('/boxers/ema-kozin/', { store: false })
    expect(edge.cache.stored.size).toBe(1)
  })

  it('logs one event per page request and none for files', async () => {
    const observe = jest.fn()
    const edge = setup({ observe })
    await edge.fetch('/boxers/jesse-hart/')
    await edge.fetch('/boxers/jesse-hart/')
    await edge.fetch('/ads.txt')
    await edge.fetch('/boxers/jesse-hart/', { deploymentId: undefined })

    expect(observe.mock.calls.map(([event]) => event)).toEqual([
      { event: 'edge_cache', state: 'MISS', status: 200, stored: true },
      { event: 'edge_cache', state: 'HIT', status: 200 },
      { event: 'edge_cache', state: 'BYPASS', status: 200 }
    ])
  })

  it.each([
    ['a redirect', 308, { location: 'https://boxingundefeated.com/about/' }],
    ['a 404', 404, HTML],
    ['an error', 500, HTML],
    ['a response that sets a cookie', 200, { ...HTML, 'set-cookie': 'session=1' }],
    ['a non-page response', 200, { 'content-type': 'application/json' }]
  ])('never stores %s', async (_name, status, headers) => {
    const edge = setup()
    edge.respondWith(status, headers)
    await edge.fetch('/boxers/nobody/')
    const again = await edge.fetch('/boxers/nobody/')

    expect(again.status).toBe(status)
    expect(again.headers.get(EDGE_CACHE_HEADER)).toBe('MISS')
    expect(edge.render).toHaveBeenCalledTimes(2)
    expect(edge.cache.stored.size).toBe(0)
  })

  it.each([
    ['a POST', new Request('https://boxingundefeated.com/boxers/', { method: 'POST' })],
    ['a sitemap', new Request('https://boxingundefeated.com/sitemap-index.xml')],
    ['ads.txt', new Request('https://boxingundefeated.com/ads.txt')],
    ['boxer JSON', new Request('https://boxingundefeated.com/data/boxers/jesse-hart.json')],
    ['an image', new Request('https://boxingundefeated.com/opengraph-image.png')],
    ['a slashless page URL', new Request('https://boxingundefeated.com/boxers/jesse-hart')],
    ['a framework path', new Request('https://boxingundefeated.com/_next/data/x/')],
    ['an API path', new Request('https://boxingundefeated.com/api/search/?q=ali')],
    [
      'an authorized request',
      new Request('https://boxingundefeated.com/boxers/', { headers: { authorization: 'x' } })
    ],
    [
      'a draft-mode request',
      new Request('https://boxingundefeated.com/boxers/', {
        headers: { cookie: '__prerender_bypass=1' }
      })
    ]
  ])('passes %s through untouched, without opening the cache', async (_name, request) => {
    const edge = setup()
    const original = new Response('file', { headers: { 'content-type': 'text/plain', etag: 'x' } })
    edge.render.mockResolvedValueOnce(original)

    const response = await edge.fetch(request)

    expect(response).toBe(original)
    expect(edge.render.mock.calls[0]?.[0]).toBe(request)
    expect(edge.openCache).not.toHaveBeenCalled()
  })

  it('passes everything through without a Worker version', async () => {
    const edge = setup({ deploymentId: undefined })
    await edge.fetch('/boxers/jesse-hart/')
    const response = await edge.fetch('/boxers/jesse-hart/')

    expect(response.headers.has(EDGE_CACHE_HEADER)).toBe(false)
    expect(edge.openCache).not.toHaveBeenCalled()
  })

  it('answers HEAD from a stored GET, without a body, and never stores a HEAD', async () => {
    const edge = setup()
    const head = () =>
      new Request('https://boxingundefeated.com/boxers/jesse-hart/', { method: 'HEAD' })
    await edge.fetch(head())
    expect(edge.cache.stored.size).toBe(0)

    await edge.fetch('/boxers/jesse-hart/')
    const hit = await edge.fetch(head())
    expect(hit.headers.get(EDGE_CACHE_HEADER)).toBe('HIT')
    expect(hit.body).toBeNull()
  })

  it('renders a cacheable request with only the allowlisted headers', async () => {
    const edge = setup()
    await edge.fetch(
      new Request('https://boxingundefeated.com/boxers/jesse-hart/', {
        headers: {
          accept: 'text/html',
          cookie: '_ga=1',
          rsc: '1',
          'x-forwarded-host': 'evil.example',
          'x-middleware-subrequest': 'middleware'
        }
      })
    )

    const [request] = edge.rendered
    expect(Object.fromEntries(request!.headers)).toEqual({
      accept: 'text/html',
      host: 'boxingundefeated.com',
      rsc: '1'
    })
  })
})
