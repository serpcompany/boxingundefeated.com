/**
 * @jest-environment node
 */
import { SMOKE_TEST_HEADER } from '../routing/canonical-host'
import { handleWorkerRequest } from './handle-request'

const production = { SITE_ENVIRONMENT: 'production', CANONICAL_HOST_REDIRECT: 'on' }
const staging = { SITE_ENVIRONMENT: 'staging', CANONICAL_HOST_REDIRECT: 'on' }
const local = { SITE_ENVIRONMENT: 'local', CANONICAL_HOST_REDIRECT: 'off' }

const WWW = 'https://www.boxingundefeated.com'
const WORKERS_DEV = 'https://boxingundefeated-com-production.serp.workers.dev'
const STAGING_WORKERS_DEV = 'https://boxingundefeated-com-staging.serp.workers.dev'

// Pages and files from `public/` both reach the Worker (`assets.run_worker_first`).
const paths = ['/', '/boxers/len-wickwar/', '/sitemap-index.xml', '/ads.txt', '/data/boxers/x.json']

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
