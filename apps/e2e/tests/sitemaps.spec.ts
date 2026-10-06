import { expect, test } from '@playwright/test'
import { target } from './site'

function locations(xml: string): string[] {
  return [...xml.matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/g)].map(match => match[1])
}

/** A canonical page URL: the bare origin for the homepage, every other page with its slash. */
function isCanonicalPage(url: string): boolean {
  const origin = target.canonicalOrigin
  if (url === origin) return true
  if (!url.startsWith(`${origin}/`) || url === `${origin}/`) return false
  const { pathname, search, hash } = new URL(url)
  return pathname.endsWith('/') && !search && !hash
}

// Pending #15, which publishes /sitemap-index.xml and root /sitemap-<group>.xml files per the
// SERP sitemap pattern, with each environment's origin. Until then the Worker serves the static
// export's nested /sitemaps/<group>/<n>.xml files, which list production URLs everywhere.
// #15 owns removing this fixme.
test.fixme('sitemaps list only canonical URLs (#15)', async ({ request }) => {
  const index = await request.get('/sitemap-index.xml', { maxRedirects: 0 })
  expect(index.status()).toBe(200)
  expect(index.headers()['content-type']).toContain('xml')
  const sitemaps = locations(await index.text())
  expect(sitemaps.length).toBeGreaterThan(0)

  for (const sitemap of sitemaps) {
    expect(sitemap).toMatch(/\/sitemap-[a-z0-9-]+\.xml$/)
    expect(sitemap.startsWith(`${target.canonicalOrigin}/`), sitemap).toBe(true)
    const response = await request.get(new URL(sitemap).pathname, { maxRedirects: 0 })
    expect(response.status(), sitemap).toBe(200)
    const urls = locations(await response.text())
    expect(urls.length, sitemap).toBeGreaterThan(0)
    const nonCanonical = urls.filter(url => !isCanonicalPage(url))
    expect(nonCanonical, `${sitemap} lists non-canonical URLs`).toEqual([])
  }
})
