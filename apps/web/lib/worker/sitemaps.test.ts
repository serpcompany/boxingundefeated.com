/**
 * @jest-environment node
 */
import type { SitemapData } from '@boxingundefeated/data-ops'
import type { SitemapContent } from '../sitemaps/sitemaps'
import type { DatasetReadiness } from './dataset-gate'
import { EDGE_CACHE_HEADER } from './edge-cache'
import { handleWorkerRequest } from './handle-request'
import { MemoryCache } from './memory-cache'
import {
  d1Sitemaps,
  handleSitemapRequest,
  isSitemapRequest,
  type SitemapOptions,
  sitemapCacheKey
} from './sitemaps'

const ORIGIN = 'https://boxingundefeated.com'
const production = { SITE_ENVIRONMENT: 'production', CANONICAL_HOST_REDIRECT: 'on' }
const staging = { SITE_ENVIRONMENT: 'staging', CANONICAL_HOST_REDIRECT: 'on' }
const ready: DatasetReadiness = {
  ready: true,
  version: 'v1',
  generation: 'v1@t1',
  importing: false
}
const notReady: DatasetReadiness = { ready: false, reason: 'the first import has not finished' }

const data: SitemapData = {
  boxers: [
    { slug: 'manuel-ortiz', updatedAt: '2025-08-08T18:56:21.604231', divisionSlug: 'bantam' }
  ],
  divisions: [
    { slug: 'bantam', name: 'Bantamweight', proDivision: 'bantam', sortOrder: 0, boxerCount: 1 }
  ]
}
const content: SitemapContent = {
  shop: [
    { path: '/shop/', lastmod: '2024-01-15' },
    { path: '/shop/best/1-inch-thick-yoga-mats/', lastmod: '2024-01-15' }
  ]
}

function setup(overrides: Partial<SitemapOptions> = {}) {
  let readiness = ready
  const cache = new MemoryCache()
  const pending: Promise<unknown>[] = []
  const load = jest.fn(async () => data)
  const observe = jest.fn()
  const options: SitemapOptions = {
    load,
    content,
    readiness: jest.fn(async () => readiness),
    siteEnvironment: 'production',
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
    load,
    observe,
    options,
    become(next: DatasetReadiness) {
      readiness = next
    },
    async fetch(path: string, init?: RequestInit, origin = ORIGIN) {
      const response = await handleSitemapRequest(new Request(`${origin}${path}`, init), options)
      await Promise.all(pending.splice(0))
      return response
    }
  }
}

describe('isSitemapRequest', () => {
  it.each([
    ['/sitemap-index.xml', true],
    ['/sitemap-pages.xml', true],
    ['/sitemap-boxers-2.xml', true],
    ['/sitemap.xml', true],
    ['/sitemaps/boxers/3.xml', true],
    ['/sitemaps/pages/1.xml', true],
    ['/sitemaps/pages/1.xml/', true],
    ['/sitemap.xml/', true],
    ['//sitemap.xml', true],
    ['/sitemaps//pages/1.xml', true],
    ['/sitemap-zzz.xml', true],
    ['/sitemap/', false],
    ['/sitemap-index.xml/', false],
    ['//sitemap-index.xml', false],
    ['/sitemaps/', false],
    ['/boxers/sitemap-index.xml', false],
    ['/robots.txt', false]
  ])('%s: %s', (path, expected) => {
    expect(isSitemapRequest(new Request(`${ORIGIN}${path}`))).toBe(expected)
  })
})

describe('handleSitemapRequest', () => {
  it('serves the index as XML that lists the root child sitemaps', async () => {
    const site = setup()
    const response = await site.fetch('/sitemap-index.xml')

    expect(response.status).toBe(200)
    expect(response.headers.get('content-type')).toBe('application/xml; charset=utf-8')
    expect(response.headers.get('cache-control')).toBe('public, max-age=3600')
    const xml = await response.text()
    expect(xml).toMatch(/^<\?xml version="1.0" encoding="UTF-8"\?>\n<sitemapindex /)
    expect([...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map(match => match[1])).toEqual([
      `${ORIGIN}/sitemap-pages.xml`,
      `${ORIGIN}/sitemap-boxers.xml`,
      `${ORIGIN}/sitemap-divisions.xml`,
      `${ORIGIN}/sitemap-shop.xml`
    ])
  })

  it('serves each child sitemap with canonical URLs on the environment origin', async () => {
    const site = setup()
    expect(await (await site.fetch('/sitemap-boxers.xml')).text()).toContain(
      `<url><loc>${ORIGIN}/boxers/manuel-ortiz/</loc><lastmod>2025-08-08</lastmod></url>`
    )
    expect(await (await site.fetch('/sitemap-shop.xml')).text()).toContain(
      `<loc>${ORIGIN}/shop/best/1-inch-thick-yoga-mats/</loc>`
    )

    const local = setup({ siteEnvironment: 'local' })
    const pages = await (
      await local.fetch('/sitemap-pages.xml', {}, 'http://localhost:8810')
    ).text()
    expect(pages).toContain('<loc>http://localhost:8787</loc>')
    expect(pages).not.toContain(ORIGIN)

    const unknown = setup({ siteEnvironment: undefined })
    expect(await (await unknown.fetch('/sitemap-pages.xml')).text()).toContain(
      '<loc>http://localhost:8787</loc>'
    )

    const stagingSite = setup({ siteEnvironment: 'staging' })
    expect(await (await stagingSite.fetch('/sitemap-pages.xml')).text()).toContain(
      '<loc>https://staging.boxingundefeated.com/about/</loc>'
    )
  })

  it.each([
    '/sitemap.xml',
    '/sitemap.xml/',
    '/sitemaps/pages/1.xml',
    '/sitemaps/pages/1.xml/',
    '/sitemaps/boxers/3.xml',
    '/sitemaps/blog/1.xml',
    '//sitemap.xml',
    '/sitemaps//pages/1.xml'
  ])('redirects the old %s to the index with a 308, without reading D1', async path => {
    const site = setup()
    const response = await site.fetch(path)

    expect(response.status).toBe(308)
    expect(response.headers.get('location')).toBe(`${ORIGIN}/sitemap-index.xml`)
    expect(site.load).not.toHaveBeenCalled()
    expect(site.options.readiness).not.toHaveBeenCalled()
  })

  it('answers 404 for a group part the data does not have', async () => {
    const site = setup()
    const response = await site.fetch('/sitemap-boxers-2.xml')
    expect(response.status).toBe(404)
    expect(response.headers.get('cache-control')).toBe('no-store')
    expect(site.cache.stored.size).toBe(0)
  })

  it.each([
    '/sitemap-zzz.xml',
    '/sitemap-blog.xml',
    '/sitemap-foo-99.xml',
    '/sitemap-index-2.xml',
    '/sitemap-pages-1.xml',
    '/sitemap-pages-02.xml'
  ])('answers 404 for the unknown name %s before any D1 read', async path => {
    const site = setup()
    const response = await site.fetch(path)

    expect(response.status).toBe(404)
    expect(response.headers.get('cache-control')).toBe('no-store')
    expect(site.load).not.toHaveBeenCalled()
    expect(site.options.readiness).not.toHaveBeenCalled()
  })

  it('answers 503 until D1 holds a finished import, and never stores it', async () => {
    const site = setup()
    site.become(notReady)
    const response = await site.fetch('/sitemap-index.xml')

    expect(response.status).toBe(503)
    expect(response.headers.get('retry-after')).toBe('120')
    expect(response.headers.get('cache-control')).toBe('no-store')
    expect(site.load).not.toHaveBeenCalled()
    expect(site.cache.stored.size).toBe(0)
  })

  it('answers 503 when D1 fails, and logs only the root cause', async () => {
    const failure = new Error('Failed query: select ...', { cause: new Error('D1_ERROR: boom') })
    failure.name = 'DrizzleQueryError'
    const site = setup({ load: jest.fn(async () => Promise.reject(failure)) })
    const response = await site.fetch('/sitemap-boxers.xml')

    expect(response.status).toBe(503)
    expect(response.headers.get('cache-control')).toBe('no-store')
    expect(site.observe).toHaveBeenCalledWith(
      expect.objectContaining({ event: 'sitemap', status: 503, error: 'Error: D1_ERROR: boom' })
    )
  })

  it('stores a sitemap at the edge per Worker version and import generation', async () => {
    const site = setup()
    const first = await site.fetch('/sitemap-boxers.xml')
    const second = await site.fetch('/sitemap-boxers.xml')

    expect(first.headers.get(EDGE_CACHE_HEADER)).toBe('MISS')
    expect(second.headers.get(EDGE_CACHE_HEADER)).toBe('HIT')
    expect(second.headers.get('cache-control')).toBe('public, max-age=3600')
    expect(second.headers.get('content-type')).toBe('application/xml; charset=utf-8')
    expect(await second.text()).toBe(await first.text())
    expect(site.load).toHaveBeenCalledTimes(1)

    // A new import generation is a new key.
    site.become({ ...ready, generation: 'v2@t2' })
    expect((await site.fetch('/sitemap-boxers.xml')).headers.get(EDGE_CACHE_HEADER)).toBe('MISS')
    expect(site.load).toHaveBeenCalledTimes(2)
    expect([...site.cache.stored.keys()]).toEqual([
      sitemapCacheKey(new Request(`${ORIGIN}/sitemap-boxers.xml`), 'version-1', 'v1@t1').url,
      sitemapCacheKey(new Request(`${ORIGIN}/sitemap-boxers.xml`), 'version-1', 'v2@t2').url
    ])
  })

  it('stores nothing during a re-import, for a HEAD, or without a Worker version', async () => {
    const importing = setup()
    importing.become({ ...ready, importing: true })
    expect((await importing.fetch('/sitemap-index.xml')).status).toBe(200)
    expect(importing.cache.stored.size).toBe(0)

    const head = setup()
    const response = await head.fetch('/sitemap-index.xml', { method: 'HEAD' })
    expect(response.status).toBe(200)
    expect(await response.text()).toBe('')
    expect(head.cache.stored.size).toBe(0)

    const unversioned = setup({ deploymentId: undefined })
    const bypass = await unversioned.fetch('/sitemap-index.xml')
    expect(bypass.headers.get(EDGE_CACHE_HEADER)).toBeNull()
    expect(unversioned.cache.stored.size).toBe(0)
  })

  it('answers other methods with 405', async () => {
    const site = setup()
    const response = await site.fetch('/sitemap-index.xml', { method: 'POST' })
    expect(response.status).toBe(405)
    expect(response.headers.get('allow')).toBe('GET, HEAD')
  })
})

describe('the sitemaps through the Worker pipeline', () => {
  function pipeline(options: Partial<SitemapOptions> = {}) {
    const site = setup(options)
    const serve = jest.fn(async () => new Response('OpenNext', { status: 404 }))
    const runtime = { sitemaps: (request: Request) => handleSitemapRequest(request, site.options) }
    return { site, serve, runtime }
  }

  it('answers the index in production without noindex and without OpenNext', async () => {
    const { serve, runtime } = pipeline()
    const response = await handleWorkerRequest(
      new Request(`${ORIGIN}/sitemap-index.xml`),
      production,
      serve,
      runtime
    )

    expect(response.status).toBe(200)
    expect(response.headers.get('x-robots-tag')).toBeNull()
    expect(serve).not.toHaveBeenCalled()
  })

  it('marks staging sitemaps noindex', async () => {
    const { serve, runtime } = pipeline({ siteEnvironment: 'staging' })
    const response = await handleWorkerRequest(
      new Request('https://staging.boxingundefeated.com/sitemap-pages.xml'),
      staging,
      serve,
      runtime
    )

    expect(response.status).toBe(200)
    expect(response.headers.get('x-robots-tag')).toBe('noindex')
    expect(await response.text()).toContain('https://staging.boxingundefeated.com/about/')
  })

  it.each([
    'https://www.boxingundefeated.com/sitemap.xml',
    'https://www.boxingundefeated.com/sitemaps/boxers/1.xml/',
    'https://boxingundefeated-com-production.serpcompany.workers.dev/sitemap.xml?x=1',
    `${ORIGIN}/sitemaps/pages/1.xml/`,
    `${ORIGIN}/sitemap.xml`,
    `${ORIGIN}//sitemap.xml`,
    `${ORIGIN}/sitemaps//pages/1.xml`
  ])('sends the old %s to the canonical index in one hop', async url => {
    const { site, serve, runtime } = pipeline()
    const response = await handleWorkerRequest(new Request(url), production, serve, runtime)

    expect(response.status).toBe(308)
    expect(response.headers.get('location')).toBe(`${ORIGIN}/sitemap-index.xml`)
    expect(serve).not.toHaveBeenCalled()
    expect(site.load).not.toHaveBeenCalled()
  })

  it('leaves a new-style sitemap URL with a slash (/sitemap-index.xml/) to the trailing-slash redirect in OpenNext', async () => {
    const { serve, runtime } = pipeline()
    await handleWorkerRequest(
      new Request(`${ORIGIN}/sitemap-index.xml/`),
      production,
      serve,
      runtime
    )
    expect(serve).toHaveBeenCalledTimes(1)
  })
})

describe('d1Sitemaps', () => {
  it('fails closed without the DB binding', async () => {
    const observe = jest.fn()
    const handler = d1Sitemaps(
      { SITE_ENVIRONMENT: 'production', CF_VERSION_METADATA: { id: 'v' } },
      { content, readiness: async () => ready, observe }
    )
    const response = await handler(new Request(`${ORIGIN}/sitemap-index.xml`))

    expect(response.status).toBe(503)
    expect(observe).toHaveBeenCalledWith(
      expect.objectContaining({ error: 'Error: the DB binding is missing' })
    )
  })
})
