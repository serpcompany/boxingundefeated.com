/**
 * @jest-environment node
 */
import {
  EDGE_CACHE_HEADER,
  EDGE_CACHE_TTL_SECONDS,
  type EdgeCacheOptions,
  withEdgeCache
} from './edge-cache'

/** The Cache API surface the edge cache uses, keyed by URL like the platform's. */
class MemoryCache {
  readonly stored = new Map<string, Response>()

  async match(key: Request): Promise<Response | undefined> {
    return this.stored.get(key.url)?.clone()
  }

  async put(key: Request, response: Response): Promise<void> {
    this.stored.set(key.url, response)
  }
}

const NEXT_DYNAMIC_CACHE_CONTROL = 'private, no-cache, no-store, max-age=0, must-revalidate'

function setup(overrides: Partial<EdgeCacheOptions> = {}) {
  const cache = new MemoryCache()
  const pending: Promise<unknown>[] = []
  const context = { waitUntil: (promise: Promise<unknown>) => void pending.push(promise) }
  const rendered: Request[] = []
  let status = 200
  let headers: Record<string, string> = { 'cache-control': NEXT_DYNAMIC_CACHE_CONTROL }
  const render = jest.fn(async (request: Request) => {
    rendered.push(request)
    return new Response(`<h1>${new URL(request.url).pathname} #${rendered.length}</h1>`, {
      status,
      headers: { 'content-type': 'text/html', ...headers }
    })
  })
  const options: EdgeCacheOptions = {
    cache: cache as unknown as Cache,
    deploymentId: 'version-1',
    ...overrides
  }
  return {
    cache,
    rendered,
    render,
    respondWith(nextStatus: number, nextHeaders: Record<string, string> = {}) {
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

  it('caches a 404, so unknown slugs do not reach D1 again', async () => {
    const edge = setup()
    edge.respondWith(404)
    await edge.fetch('/boxers/nobody/')

    const again = await edge.fetch('/boxers/nobody/')
    expect(again.status).toBe(404)
    expect(again.headers.get(EDGE_CACHE_HEADER)).toBe('HIT')
  })

  it('never stores errors or responses that set cookies', async () => {
    const edge = setup()
    edge.respondWith(500)
    await edge.fetch('/boxers/jesse-hart/')
    edge.respondWith(200, { 'set-cookie': 'session=1' })
    await edge.fetch('/boxers/ema-kozin/')

    expect(edge.cache.stored.size).toBe(0)
  })

  it.each([
    ['a POST', new Request('https://boxingundefeated.com/boxers/', { method: 'POST' })],
    ['a framework path', new Request('https://boxingundefeated.com/_next/data/x.json')],
    ['an API path', new Request('https://boxingundefeated.com/api/search?q=ali')],
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
  ])('bypasses %s', async (_name, request) => {
    const edge = setup()
    await edge.fetch(request.clone())
    const response = await edge.fetch(request.clone())

    expect(response.headers.get(EDGE_CACHE_HEADER)).toBe('BYPASS')
    expect(edge.render).toHaveBeenCalledTimes(2)
    expect(edge.cache.stored.size).toBe(0)
  })

  it('bypasses everything without a Worker version', async () => {
    const edge = setup({ deploymentId: undefined })
    await edge.fetch('/boxers/jesse-hart/')

    expect((await edge.fetch('/boxers/jesse-hart/')).headers.get(EDGE_CACHE_HEADER)).toBe('BYPASS')
    expect(edge.cache.stored.size).toBe(0)
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
