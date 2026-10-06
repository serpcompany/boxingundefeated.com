import type { SitemapData } from '@boxingundefeated/data-ops'
import {
  lastmodDate,
  latestDate,
  MAX_URLS_PER_SITEMAP,
  renderSitemapFile,
  SITEMAP_INDEX_PATH,
  type SitemapContent,
  sitemapEntries,
  sitemapFiles
} from './sitemaps'

const ORIGIN = 'https://boxingundefeated.com'

function boxer(slug: string, divisionSlug: string | null, updatedAt: string | null) {
  return { slug, divisionSlug, updatedAt }
}

const division = (slug: string, sortOrder: number, boxerCount: number) => ({
  slug,
  name: slug,
  proDivision: slug,
  sortOrder,
  boxerCount
})

// 49 heavyweights: /boxers/ and /divisions/heavy/ each have a second page.
const data: SitemapData = {
  boxers: [
    boxer('ana-alpha', 'heavy', '2025-08-08T18:56:21.604231'),
    boxer('bob-bravo', 'welter', '2025-09-01T00:00:00'),
    boxer('no-date', null, null),
    ...Array.from({ length: 48 }, (_, index) =>
      boxer(`heavy-${index}`, 'heavy', '2025-07-01T10:00:00')
    )
  ],
  divisions: [division('heavy', 0, 49), division('welter', 1, 1), division('minimum', 2, 0)]
}

const content: SitemapContent = {
  shop: [
    { path: '/shop/', lastmod: '2024-03-01' },
    { path: "/shop/best/men's-water-bottles/", lastmod: '2024-01-15' },
    { path: '/shop/best/2.7-l-water-bottles/', lastmod: '2024-03-01' }
  ]
}

/** Parses XML the way a crawler does; fails on anything that isn't well-formed. */
function parse(xml: string): Document {
  const document = new DOMParser().parseFromString(xml, 'application/xml')
  expect(document.getElementsByTagName('parsererror')).toHaveLength(0)
  return document
}

function locs(document: Document): string[] {
  return [...document.getElementsByTagName('loc')].map(loc => loc.textContent ?? '')
}

function render(path: string, maxUrls?: number): string {
  const xml = renderSitemapFile(path, ORIGIN, data, content, maxUrls)
  if (xml === null) throw new Error(`no sitemap at ${path}`)
  return xml
}

/** The canonical form: the bare origin for the homepage, a slash at the end of every other page. */
function isCanonical(url: string): boolean {
  if (url === ORIGIN) return true
  const parsed = new URL(url)
  return (
    parsed.origin === ORIGIN &&
    parsed.pathname !== '/' &&
    parsed.pathname.endsWith('/') &&
    !parsed.search &&
    !parsed.hash
  )
}

describe('lastmod dates', () => {
  it.each([
    ['2025-08-08T18:56:21.604231', '2025-08-08'],
    ['2024-01-15T05:17:03Z', '2024-01-15'],
    ['2024-01-15', '2024-01-15'],
    ['2024-02-30T00:00:00', undefined],
    ['Aug 2025', undefined],
    ['', undefined],
    [null, undefined]
  ])('%s is %s', (timestamp, expected) => {
    expect(lastmodDate(timestamp)).toBe(expected)
  })

  it('picks the latest date, or none', () => {
    expect(latestDate(['2024-01-02', undefined, '2025-01-01', '2024-12-31'])).toBe('2025-01-01')
    expect(latestDate([undefined])).toBeUndefined()
  })
})

describe('sitemap entries', () => {
  const groups = sitemapEntries(data, content)

  it('lists the homepage as its own path and the static pages, without /blog/', () => {
    expect(groups.pages.map(entry => entry.path)).toEqual([
      '/',
      '/about/',
      '/search/',
      '/brands/',
      '/privacy/',
      '/terms/',
      '/sitemap/'
    ])
  })

  it('lists every boxer listing page and profile', () => {
    expect(groups.boxers.map(entry => entry.path)).toEqual([
      '/boxers/',
      '/boxers/page/2/',
      ...data.boxers.map(row => `/boxers/${row.slug}/`)
    ])
  })

  it('lists /divisions/ and every page of every division, empty ones included', () => {
    expect(groups.divisions.map(entry => entry.path)).toEqual([
      '/divisions/',
      '/divisions/heavy/',
      '/divisions/heavy/page/2/',
      '/divisions/welter/',
      '/divisions/minimum/'
    ])
  })

  it('takes the shop group from the build content as it is', () => {
    expect(groups.shop).toBe(content.shop)
  })

  it("dates a profile by the boxer's updated_at and a listing by the latest one it shows", () => {
    const lastmod = (path: string) =>
      Object.values(groups)
        .flat()
        .find(entry => entry.path === path)?.lastmod

    expect(lastmod('/boxers/ana-alpha/')).toBe('2025-08-08')
    expect(lastmod('/boxers/no-date/')).toBeUndefined()
    expect(lastmod('/')).toBe('2025-09-01')
    expect(lastmod('/boxers/page/2/')).toBe('2025-09-01')
    expect(lastmod('/divisions/')).toBe('2025-09-01')
    expect(lastmod('/divisions/heavy/page/2/')).toBe('2025-08-08')
    expect(lastmod('/divisions/welter/')).toBe('2025-09-01')
    expect(lastmod('/divisions/minimum/')).toBeUndefined()
    // Pages that show no data have no known change date: no lastmod rather than a made-up one.
    expect(lastmod('/about/')).toBeUndefined()
  })
})

describe('sitemap files', () => {
  it('names one root file per group while every group fits', () => {
    expect(sitemapFiles(sitemapEntries(data, content)).map(file => file.path)).toEqual([
      '/sitemap-pages.xml',
      '/sitemap-boxers.xml',
      '/sitemap-divisions.xml',
      '/sitemap-shop.xml'
    ])
    expect(MAX_URLS_PER_SITEMAP).toBe(50_000)
  })

  it('continues an overflowing group in numbered files beside the first', () => {
    const files = sitemapFiles(sitemapEntries(data, content), 20)
    expect(files.map(file => [file.path, file.entries.length])).toEqual([
      ['/sitemap-pages.xml', 7],
      ['/sitemap-boxers.xml', 20],
      ['/sitemap-boxers-2.xml', 20],
      ['/sitemap-boxers-3.xml', 13],
      ['/sitemap-divisions.xml', 5],
      ['/sitemap-shop.xml', 3]
    ])
  })

  it('has no file for an empty group', () => {
    const files = sitemapFiles(sitemapEntries(data, { shop: [] }))
    expect(files.map(file => file.group)).toEqual(['pages', 'boxers', 'divisions'])
  })
})

describe('rendered XML', () => {
  it('indexes every child sitemap directly, at the root, with its latest lastmod', () => {
    const index = parse(render(SITEMAP_INDEX_PATH, 20))

    expect(index.documentElement.localName).toBe('sitemapindex')
    expect(index.documentElement.namespaceURI).toBe('http://www.sitemaps.org/schemas/sitemap/0.9')
    const entries = [...index.getElementsByTagName('sitemap')].map(sitemap => [
      sitemap.getElementsByTagName('loc')[0]?.textContent,
      sitemap.getElementsByTagName('lastmod')[0]?.textContent
    ])
    expect(entries).toEqual([
      [`${ORIGIN}/sitemap-pages.xml`, '2025-09-01'],
      [`${ORIGIN}/sitemap-boxers.xml`, '2025-09-01'],
      [`${ORIGIN}/sitemap-boxers-2.xml`, '2025-07-01'],
      [`${ORIGIN}/sitemap-boxers-3.xml`, '2025-07-01'],
      [`${ORIGIN}/sitemap-divisions.xml`, '2025-09-01'],
      [`${ORIGIN}/sitemap-shop.xml`, '2024-03-01']
    ])
  })

  it('lists every page once, at its canonical URL, across the child sitemaps', () => {
    const index = parse(render(SITEMAP_INDEX_PATH, 20))
    const urls = locs(index).flatMap(sitemap => {
      const document = parse(render(new URL(sitemap).pathname, 20))
      expect(document.documentElement.localName).toBe('urlset')
      expect(document.getElementsByTagName('url')).toHaveLength(locs(document).length)
      return locs(document)
    })

    expect(urls.filter(url => !isCanonical(url))).toEqual([])
    expect(new Set(urls).size).toBe(urls.length)
    expect(urls).toHaveLength(7 + 53 + 5 + 3)
    expect(urls[0]).toBe(ORIGIN)
    expect(urls).not.toContain(`${ORIGIN}/`)
    expect(urls).toContain(`${ORIGIN}/shop/best/men's-water-bottles/`)
    expect(urls).toContain(`${ORIGIN}/shop/best/2.7-l-water-bottles/`)
  })

  it('escapes URLs for XML and omits an unknown lastmod', () => {
    const shop = render('/sitemap-shop.xml')
    expect(shop).toContain(`<loc>${ORIGIN}/shop/best/men&apos;s-water-bottles/</loc>`)
    const pages = render('/sitemap-pages.xml')
    expect(pages).toContain(`<url><loc>${ORIGIN}</loc><lastmod>2025-09-01</lastmod></url>`)
    expect(pages).toContain(`<url><loc>${ORIGIN}/about/</loc></url>`)
  })

  it('uses the origin it is given, such as the local one', () => {
    const local = renderSitemapFile('/sitemap-pages.xml', 'http://localhost:8787', data, content)
    expect(locs(parse(local ?? ''))[0]).toBe('http://localhost:8787')
    expect(local).not.toContain(ORIGIN)
  })

  it('has no file for a name the index does not list', () => {
    for (const path of ['/sitemap-blog.xml', '/sitemap-boxers-2.xml', '/sitemap-pages-1.xml']) {
      expect(renderSitemapFile(path, ORIGIN, data, content)).toBeNull()
    }
  })
})
