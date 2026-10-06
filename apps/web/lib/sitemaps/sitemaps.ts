/**
 * The XML sitemaps, per the SERP sitemap index pattern
 * (serpcompany/serp `docs/engineering/websites/features/xml-sitemaps.md`):
 *
 * - `/sitemap-index.xml` is the entrypoint. robots.txt advertises it in production (lib/robots.ts),
 *   and it lists the child sitemaps directly, never another index.
 * - Each child sits at the site root and is named by its content group: `/sitemap-pages.xml`,
 *   `/sitemap-boxers.xml`, `/sitemap-divisions.xml`, `/sitemap-shop.xml`. A group past
 *   `MAX_URLS_PER_SITEMAP` continues in `/sitemap-<group>-2.xml` and so on, each listed by the index.
 * - Every `<loc>` is the page's canonical URL on the environment's origin: the homepage is the bare
 *   origin, every other page ends in a slash (SERP URL trailing-slash standard).
 * - `<lastmod>` is when the page's content last changed, as a date, and is left out when that is
 *   unknown, never the time the sitemap was generated: a boxer's `updated_at`, the latest of those
 *   for a listing that shows them, a shop article's `publishDate`. The index gives each child the
 *   latest `<lastmod>` it lists.
 *
 * The Worker serves these files on request (lib/worker/sitemaps.ts), from D1 and from the content
 * entries its build recorded (lib/sitemaps/content.ts). Pure functions: no Next.js, no `fs`.
 */
import type { SitemapData } from '@boxingundefeated/data-ops'
import {
  BOXER_PAGE_SIZE,
  getBoxersPageHref,
  getDivisionPageHref,
  getPaginationPages
} from '../directory-pagination'

export const SITEMAP_INDEX_PATH = '/sitemap-index.xml'

/** The content groups, in the order the index lists them. */
export const SITEMAP_GROUPS = ['pages', 'boxers', 'divisions', 'shop'] as const
export type SitemapGroup = (typeof SITEMAP_GROUPS)[number]

/** The protocol's limit per file. At about 100 bytes per entry, it stays far below 50 MB. */
export const MAX_URLS_PER_SITEMAP = 50_000

/**
 * The pages that read no data, after the homepage. `/blog/` is left out while it lists no posts,
 * and the shop, boxer and division listings are in their own groups.
 */
export const STATIC_PAGE_PATHS: readonly string[] = [
  '/about/',
  '/search/',
  '/brands/',
  '/privacy/',
  '/terms/',
  '/sitemap/'
]

/** One page: its canonical path (`/` or ending in `/`) and, when known, its `<lastmod>` date. */
export interface SitemapEntry {
  path: string
  lastmod?: string
}

/** What the build records from `content/` (lib/sitemaps/content.ts). */
export interface SitemapContent {
  /** `/shop/`, its pages and every shop article. */
  shop: SitemapEntry[]
}

export interface SitemapFile {
  /** `/sitemap-<group>.xml`, or `/sitemap-<group>-<n>.xml` from the second file of a group. */
  path: string
  group: SitemapGroup
  entries: SitemapEntry[]
}

export function sitemapFilePath(group: SitemapGroup, part: number): string {
  return part <= 1 ? `/sitemap-${group}.xml` : `/sitemap-${group}-${part}.xml`
}

/**
 * The `YYYY-MM-DD` date of an ISO 8601 timestamp such as D1's `2025-08-08T18:56:21.604231` (no
 * zone) or a shop article's `2024-01-15T05:17:03Z`. A date alone is valid W3C Datetime, so no zone
 * has to be guessed. Undefined for anything else.
 */
export function lastmodDate(timestamp: string | null | undefined): string | undefined {
  const date = /^(\d{4}-\d{2}-\d{2})(?:$|[T ])/.exec(timestamp ?? '')?.[1]
  if (!date) return undefined
  const parsed = new Date(`${date}T00:00:00Z`)
  return Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== date
    ? undefined
    : date
}

/** The latest of `YYYY-MM-DD` dates, or undefined when there is none. */
export function latestDate(dates: Iterable<string | undefined>): string | undefined {
  let latest: string | undefined
  for (const date of dates) {
    if (date && (!latest || date > latest)) latest = date
  }
  return latest
}

function withLastmod(path: string, lastmod: string | undefined): SitemapEntry {
  return lastmod ? { path, lastmod } : { path }
}

/** Every page each group lists, from D1 (`getSitemapData`) and the build's content entries. */
export function sitemapEntries(
  data: SitemapData,
  content: SitemapContent
): Record<SitemapGroup, SitemapEntry[]> {
  const boxerDates = data.boxers.map(boxer => lastmodDate(boxer.updatedAt))
  // The homepage, `/boxers/` and `/divisions/` show stats, rankings or counts over every boxer.
  const anyBoxer = latestDate(boxerDates)

  const divisionDates = new Map<string, string | undefined>()
  data.boxers.forEach((boxer, index) => {
    if (!boxer.divisionSlug) return
    divisionDates.set(
      boxer.divisionSlug,
      latestDate([divisionDates.get(boxer.divisionSlug), boxerDates[index]])
    )
  })

  return {
    pages: [withLastmod('/', anyBoxer), ...STATIC_PAGE_PATHS.map(path => ({ path }))],
    boxers: [
      ...getPaginationPages(data.boxers.length, BOXER_PAGE_SIZE).map(page =>
        withLastmod(getBoxersPageHref(page), anyBoxer)
      ),
      ...data.boxers.map((boxer, index) => withLastmod(`/boxers/${boxer.slug}/`, boxerDates[index]))
    ],
    divisions: [
      withLastmod('/divisions/', anyBoxer),
      ...data.divisions.flatMap(division =>
        getPaginationPages(division.boxerCount, BOXER_PAGE_SIZE).map(page =>
          withLastmod(getDivisionPageHref(division.slug, page), divisionDates.get(division.slug))
        )
      )
    ],
    shop: content.shop
  }
}

/**
 * The child sitemaps: each group split into files of at most `maxUrls` entries. A group with no
 * entries has no file.
 */
export function sitemapFiles(
  groups: Record<SitemapGroup, SitemapEntry[]>,
  maxUrls = MAX_URLS_PER_SITEMAP
): SitemapFile[] {
  return SITEMAP_GROUPS.flatMap(group => {
    const entries = groups[group]
    const files: SitemapFile[] = []
    for (let start = 0; start < entries.length; start += maxUrls) {
      files.push({
        path: sitemapFilePath(group, files.length + 1),
        group,
        entries: entries.slice(start, start + maxUrls)
      })
    }
    return files
  })
}

/** The absolute URL of a canonical path: the homepage is the origin without a slash. */
export function sitemapUrl(origin: string, path: string): string {
  return path === '/' ? origin : `${origin}${path}`
}

export function escapeXml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;')
}

const XML_DECLARATION = '<?xml version="1.0" encoding="UTF-8"?>'
const SITEMAP_NAMESPACE = 'http://www.sitemaps.org/schemas/sitemap/0.9'

function element(tag: 'url' | 'sitemap', loc: string, lastmod: string | undefined): string {
  const date = lastmod ? `<lastmod>${lastmod}</lastmod>` : ''
  return `<${tag}><loc>${escapeXml(loc)}</loc>${date}</${tag}>`
}

export function renderUrlset(origin: string, entries: SitemapEntry[]): string {
  return [
    XML_DECLARATION,
    `<urlset xmlns="${SITEMAP_NAMESPACE}">`,
    ...entries.map(entry => element('url', sitemapUrl(origin, entry.path), entry.lastmod)),
    '</urlset>',
    ''
  ].join('\n')
}

export function renderSitemapIndex(origin: string, files: SitemapFile[]): string {
  return [
    XML_DECLARATION,
    `<sitemapindex xmlns="${SITEMAP_NAMESPACE}">`,
    ...files.map(file =>
      element(
        'sitemap',
        `${origin}${file.path}`,
        latestDate(file.entries.map(entry => entry.lastmod))
      )
    ),
    '</sitemapindex>',
    ''
  ].join('\n')
}

/** The XML at `path` (the index or a child sitemap), or null when there is no such file. */
export function renderSitemapFile(
  path: string,
  origin: string,
  data: SitemapData,
  content: SitemapContent,
  maxUrls = MAX_URLS_PER_SITEMAP
): string | null {
  const files = sitemapFiles(sitemapEntries(data, content), maxUrls)
  if (path === SITEMAP_INDEX_PATH) return renderSitemapIndex(origin, files)
  const file = files.find(candidate => candidate.path === path)
  return file ? renderUrlset(origin, file.entries) : null
}
