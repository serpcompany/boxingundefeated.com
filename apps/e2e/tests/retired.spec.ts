import { decodeEntities, isNoindex, pageFacts } from '../src/html'
import { expect, samplePages, target, test } from './site'

/**
 * Retired URLs (#59, #94; apps/web/lib/routing/retired-paths.ts): `/blog`, `/brands` and `/shop`,
 * every path under them, and `/sitemap-shop.xml` answer 410 Gone directly, without a redirect
 * first: a small page with noindex that links home, never stored by the edge cache. No page links
 * to them, and the sitemap index no longer lists the shop's sitemap.
 *
 * On the production apex the shared brands Worker (serpcompany/serp `workers/brands-page`) answers
 * `boxingundefeated.com/brands*` before this Worker until serpcompany/serp#1490 removes its route:
 * `/brands` gets its 308 first. CI tests the workers.dev host, which that route never covers.
 */
const RETIRED_SECTIONS = ['/blog', '/brands', '/shop']
const RETIRED_FILES = ['/sitemap-shop.xml']
const retiredPaths = [
  '/blog/',
  '/blog',
  '/blog/jab/',
  '/brands/',
  '/brands',
  '/shop',
  '/shop/',
  '/shop/page/2/',
  '/shop/best/1-inch-thick-yoga-mats/',
  // The shop's articles with non-ASCII letters, in each spelling that used to get a 308 first
  // (#54): canonical NFC, lowercase hex, NFD without the slash, the old route key, and `//`.
  '/shop/best/br%C3%BCmate-water-bottles/',
  '/shop/best/br%c3%bcmate-water-bottles/',
  '/shop/best/bru%CC%88mate-water-bottles',
  '/shop/best/br~C3~BCmate-water-bottles/',
  '/shop//best/nestl%C3%A9-water-bottles/',
  '/sitemap-shop.xml'
]
/** The sample pages, plus the pages that used to link a retired section (footer, HTML sitemap). */
const linkingPages = [...samplePages.map(page => page.path), '/about/', '/sitemap/']

function isRetired(pathname: string): boolean {
  return (
    RETIRED_SECTIONS.some(section => pathname === section || pathname.startsWith(`${section}/`)) ||
    RETIRED_FILES.includes(pathname)
  )
}

for (const path of retiredPaths) {
  test(`${path} answers 410 Gone with noindex, never from the edge cache`, async ({ request }) => {
    for (const attempt of ['first', 'repeat']) {
      const response = await request.get(path, { maxRedirects: 0 })
      const headers = response.headers()
      expect(response.status(), `${attempt} status`).toBe(410)
      expect(headers.location, `${attempt}: no redirect`).toBeUndefined()
      expect(headers['content-type']).toContain('text/html')
      expect(headers['cache-control']).toBe('no-store')
      expect(headers['x-edge-cache'], `${attempt}: never stored`).toBeUndefined()
      expect(isNoindex(headers['x-robots-tag']), `X-Robots-Tag: ${headers['x-robots-tag']}`).toBe(
        true
      )

      const html = await response.text()
      const facts = pageFacts(html)
      expect(isNoindex(facts.robots), `<meta name="robots" content="${facts.robots}">`).toBe(true)
      expect(facts.h1).toBe('Page Gone')
      expect(html).toContain('<a href="/">')
    }
  })
}

test('the sitemap index no longer lists the shop sitemap', async ({ request }) => {
  const response = await request.get('/sitemap-index.xml', { maxRedirects: 0 })
  expect(response.status()).toBe(200)
  const sitemaps = [...(await response.text()).matchAll(/<loc>([^<]+)<\/loc>/g)].map(
    match => new URL(match[1]).pathname
  )
  expect(sitemaps.length).toBeGreaterThan(0)
  expect(sitemaps.filter(isRetired)).toEqual([])
})

test('/shopping/ and /shops/ are unknown paths, not retired ones', async ({ request }) => {
  for (const path of ['/shopping/', '/shops/']) {
    const response = await request.get(path, { maxRedirects: 0 })
    expect(response.status(), path).toBe(404)
  }
})

test('no sampled page links to a retired path', async ({ request }) => {
  for (const path of linkingPages) {
    const response = await request.get(path, { maxRedirects: 0 })
    expect(response.status(), path).toBe(200)
    const html = await response.text()
    const hrefs = [...html.matchAll(/<a\b[^>]*?\shref\s*=\s*(?:"([^"]*)"|'([^']*)')/gi)].map(
      match => decodeEntities(match[1] ?? match[2] ?? '')
    )
    expect(hrefs.length, `${path} has links`).toBeGreaterThan(0)
    const retired = hrefs.filter(href => {
      const url = new URL(href, target.baseUrl)
      return (
        [target.baseUrl, target.canonicalOrigin].includes(url.origin) && isRetired(url.pathname)
      )
    })
    expect(retired, path).toEqual([])
  }
})
