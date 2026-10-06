import { type APIRequestContext, expect, type Page, test } from '@playwright/test'
import { pageFacts } from '../src/html'
import { target } from './site'

/**
 * The XML sitemaps (serpcompany/serp docs/engineering/websites/features/xml-sitemaps.md, and the
 * "Verification" sections of the URL trailing-slash and environment configuration standards):
 * `/sitemap-index.xml` lists root `/sitemap-<group>.xml` files on the environment's origin, every
 * one is well-formed XML, and every URL they list is a canonical page that answers 200 with
 * itself as its canonical. The Worker generates them from D1 (apps/web/lib/worker/sitemaps.ts).
 *
 * Locally every listed URL is requested (with a full import, about 6,450); on a deployed
 * environment, which is a shared live site, the first and last few of each child sitemap.
 */
const SAMPLE_PER_SITEMAP = 3
const CONCURRENCY = target.isLocal ? 8 : 2

interface ParsedSitemap {
  root: string | null
  namespace: string | null
  errors: number
  locs: string[]
}

/** Parses the XML with the browser's parser, as strictly as a crawler: any error is reported. */
async function parseXml(page: Page, xml: string): Promise<ParsedSitemap> {
  return page.evaluate(source => {
    const document = new DOMParser().parseFromString(source, 'application/xml')
    return {
      root: document.documentElement?.localName ?? null,
      namespace: document.documentElement?.namespaceURI ?? null,
      errors: document.getElementsByTagName('parsererror').length,
      locs: [...document.getElementsByTagName('loc')].map(loc => loc.textContent?.trim() ?? '')
    }
  }, xml)
}

async function fetchSitemap(
  request: APIRequestContext,
  page: Page,
  path: string,
  root: 'sitemapindex' | 'urlset'
): Promise<string[]> {
  const response = await request.get(path, { maxRedirects: 0 })
  expect(response.status(), path).toBe(200)
  expect(response.headers()['content-type'], path).toContain('application/xml')
  const parsed = await parseXml(page, await response.text())
  expect(parsed.errors, `${path} is well-formed XML`).toBe(0)
  expect(parsed.root, path).toBe(root)
  expect(parsed.namespace, path).toBe('http://www.sitemaps.org/schemas/sitemap/0.9')
  expect(parsed.locs.length, `${path} lists URLs`).toBeGreaterThan(0)
  return parsed.locs
}

/** A canonical page URL: the bare origin for the homepage, every other page with its slash. */
function isCanonicalPage(url: string): boolean {
  const origin = target.canonicalOrigin
  if (url === origin) return true
  if (!url.startsWith(`${origin}/`) || url === `${origin}/`) return false
  const { pathname, search, hash } = new URL(url)
  return pathname.endsWith('/') && !search && !hash
}

/** The path to request for a listed URL, on the origin under test. */
function pathOf(url: string): string {
  return url === target.canonicalOrigin ? '/' : url.slice(target.canonicalOrigin.length)
}

test('the sitemap index lists root child sitemaps of canonical, unique URLs that each answer 200 with themselves as canonical', async ({
  request,
  page
}) => {
  test.setTimeout(target.isLocal ? 20 * 60_000 : 3 * 60_000)

  const sitemaps = await fetchSitemap(request, page, '/sitemap-index.xml', 'sitemapindex')
  const urls: string[] = []
  const toCheck: string[] = []
  for (const sitemap of sitemaps) {
    expect(sitemap.startsWith(`${target.canonicalOrigin}/`), `${sitemap} is on the origin`).toBe(
      true
    )
    expect(new URL(sitemap).pathname, 'a root sitemap named by its group').toMatch(
      /^\/sitemap-[a-z]+(?:-\d+)?\.xml$/
    )
    const listed = await fetchSitemap(request, page, new URL(sitemap).pathname, 'urlset')
    const nonCanonical = listed.filter(url => !isCanonicalPage(url))
    expect(nonCanonical, `${sitemap} lists non-canonical URLs`).toEqual([])
    urls.push(...listed)
    toCheck.push(
      ...(target.isLocal
        ? listed
        : [...listed.slice(0, SAMPLE_PER_SITEMAP), ...listed.slice(-SAMPLE_PER_SITEMAP)])
    )
  }
  expect(urls).toContain(target.canonicalOrigin)
  expect(urls.length - new Set(urls).size, 'URLs listed more than once').toBe(0)

  const failures: string[] = []
  let next = 0
  const unique = [...new Set(toCheck)]
  await Promise.all(
    Array.from({ length: CONCURRENCY }, async () => {
      while (next < unique.length) {
        const url = unique[next++]
        const response = await request.get(pathOf(url), { maxRedirects: 0 })
        if (response.status() !== 200) {
          failures.push(`${url}: ${response.status()} ${response.headers().location ?? ''}`)
          continue
        }
        const { canonical } = pageFacts(await response.text())
        if (canonical !== url) failures.push(`${url}: canonical ${canonical}`)
      }
    })
  )
  expect(failures, `of ${unique.length} listed URLs checked`).toEqual([])
})

test('old sitemap URLs answer 308 to the sitemap index', async ({ request }) => {
  for (const path of ['/sitemap.xml', '/sitemaps/pages/1.xml', '/sitemaps/boxers/3.xml']) {
    const response = await request.get(path, { maxRedirects: 0 })
    expect(response.status(), path).toBe(308)
    const location = new URL(response.headers().location ?? '', target.baseUrl)
    expect(`${location.origin}${location.pathname}`, path).toBe(
      `${target.baseUrl}/sitemap-index.xml`
    )
  }
})
