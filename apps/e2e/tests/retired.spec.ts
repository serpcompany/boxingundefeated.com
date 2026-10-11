import { expect, test } from '@playwright/test'
import { decodeEntities, isNoindex, pageFacts } from '../src/html'
import { samplePages, target } from './site'

/**
 * Retired sections (#59; apps/web/lib/routing/retired-paths.ts): `/blog` and `/brands`, and every
 * path under them, answer 410 Gone directly, without a redirect first: a small page with noindex
 * that links home, never stored by the edge cache. No page links to them.
 *
 * On the production apex the shared brands Worker (serpcompany/serp `workers/brands-page`) answers
 * `boxingundefeated.com/brands*` before this Worker until serpcompany/serp#1490 removes its route:
 * `/brands` gets its 308 first. CI tests the workers.dev host, which that route never covers.
 */
const RETIRED_SECTIONS = ['/blog', '/brands']
const retiredPaths = ['/blog/', '/blog', '/blog/jab/', '/brands/', '/brands']
/** The sample pages, plus the pages that used to link a retired section (footer, HTML sitemap). */
const linkingPages = [...samplePages.map(page => page.path), '/about/', '/sitemap/', '/shop/']

function isRetired(pathname: string): boolean {
  return RETIRED_SECTIONS.some(
    section => pathname === section || pathname.startsWith(`${section}/`)
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

test('no sampled page links to a retired section', async ({ request }) => {
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
