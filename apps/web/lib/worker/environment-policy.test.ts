/**
 * @jest-environment node
 */
import { isProductionRuntime, withEnvironmentPolicy } from './environment-policy'

const page = () =>
  Promise.resolve(
    new Response('<html></html>', {
      status: 200,
      headers: { 'content-type': 'text/html', 'cache-control': 'public, max-age=60' }
    })
  )
const productionRobots = () =>
  Promise.resolve(
    new Response(
      'User-Agent: *\nAllow: /\n\nSitemap: https://boxingundefeated.com/sitemap-index.xml\n'
    )
  )

function request(pathname: string, method = 'GET') {
  return new Request(`http://localhost:8787${pathname}`, { method })
}

describe('isProductionRuntime', () => {
  it('is true only for an exact SITE_ENVIRONMENT=production', () => {
    expect(isProductionRuntime({ SITE_ENVIRONMENT: 'production' })).toBe(true)
    expect(isProductionRuntime({ SITE_ENVIRONMENT: 'staging' })).toBe(false)
    expect(isProductionRuntime({ SITE_ENVIRONMENT: 'local' })).toBe(false)
    expect(isProductionRuntime({ SITE_ENVIRONMENT: 'Production' })).toBe(false)
    expect(isProductionRuntime({})).toBe(false)
  })
})

describe('withEnvironmentPolicy', () => {
  it('leaves production responses alone', async () => {
    const response = await withEnvironmentPolicy(
      request('/boxers/saul-alvarez/'),
      { SITE_ENVIRONMENT: 'production' },
      page
    )

    expect(response.headers.get('x-robots-tag')).toBeNull()
    expect(response.headers.get('cache-control')).toBe('public, max-age=60')
    expect(await response.text()).toBe('<html></html>')

    const robots = await withEnvironmentPolicy(
      request('/robots.txt'),
      { SITE_ENVIRONMENT: 'production' },
      productionRobots
    )
    expect(await robots.text()).toContain('Sitemap: https://boxingundefeated.com/sitemap-index.xml')
  })

  it.each([
    ['staging', { SITE_ENVIRONMENT: 'staging' }],
    ['local', { SITE_ENVIRONMENT: 'local' }],
    ['a missing SITE_ENVIRONMENT', {}]
  ])('sends noindex for %s and keeps the response', async (_name, env) => {
    const response = await withEnvironmentPolicy(request('/boxers/saul-alvarez/'), env, page)

    expect(response.status).toBe(200)
    expect(response.headers.get('x-robots-tag')).toBe('noindex')
    expect(response.headers.get('content-type')).toBe('text/html')
    expect(await response.text()).toBe('<html></html>')
  })

  it('answers robots.txt with Disallow outside production, without calling Next.js', async () => {
    const handle = jest.fn(productionRobots)
    const response = await withEnvironmentPolicy(request('/robots.txt'), {}, handle)

    expect(handle).not.toHaveBeenCalled()
    expect(response.headers.get('content-type')).toBe('text/plain; charset=utf-8')
    expect(response.headers.get('x-robots-tag')).toBe('noindex')
    expect(await response.text()).toBe('User-agent: *\nDisallow: /\n')

    const head = await withEnvironmentPolicy(request('/robots.txt', 'HEAD'), {}, handle)
    expect(head.status).toBe(200)
    expect(await head.text()).toBe('')
  })

  it('keeps the status of non-production errors and redirects', async () => {
    const notFound = await withEnvironmentPolicy(request('/nope/'), {}, () =>
      Promise.resolve(new Response('missing', { status: 404 }))
    )
    expect(notFound.status).toBe(404)
    expect(notFound.headers.get('x-robots-tag')).toBe('noindex')

    const redirect = await withEnvironmentPolicy(request('/about'), {}, () =>
      Promise.resolve(new Response(null, { status: 308, headers: { location: '/about/' } }))
    )
    expect(redirect.status).toBe(308)
    expect(redirect.headers.get('location')).toBe('/about/')
  })

  it('rewraps with new Response(body, response), keeping the status, headers and webSocket', async () => {
    // Workers' Response accepts and copies `webSocket`; Node's does not, so emulate it the way
    // the Workers runtime reads its init: from the response passed as the init argument.
    const webSocket = { accept: jest.fn() }
    const upstream = new Response(null, {
      status: 200,
      statusText: 'Switching',
      headers: { 'set-cookie': 'a=1', vary: 'accept' }
    })
    Object.defineProperty(upstream, 'webSocket', { value: webSocket })
    const NativeResponse = globalThis.Response
    const seenInits: unknown[] = []
    class WorkersResponse extends NativeResponse {
      webSocket: unknown
      constructor(body?: BodyInit | null, init?: ResponseInit & { webSocket?: unknown }) {
        super(body, init)
        seenInits.push(init)
        this.webSocket = init?.webSocket ?? null
      }
    }
    globalThis.Response = WorkersResponse as typeof Response
    try {
      const response = await withEnvironmentPolicy(request('/live/'), {}, () =>
        Promise.resolve(upstream)
      )

      expect(seenInits).toContain(upstream)
      expect(response.status).toBe(200)
      expect(response.statusText).toBe('Switching')
      expect(response.headers.get('set-cookie')).toBe('a=1')
      expect(response.headers.get('vary')).toBe('accept')
      expect(response.headers.get('x-robots-tag')).toBe('noindex')
      expect((response as WorkersResponse).webSocket).toBe(webSocket)
      // The upstream headers are not mutated.
      expect(upstream.headers.get('x-robots-tag')).toBeNull()
    } finally {
      globalThis.Response = NativeResponse
    }
  })
})
