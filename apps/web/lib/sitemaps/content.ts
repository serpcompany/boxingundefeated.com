/**
 * The sitemap entries that come from `content/`, not from D1: `/shop/`, its pages and every shop
 * article. The Worker can't read `content/` on request, so `build:worker` records them in
 * `.open-next/sitemap-content.json` (scripts/write-sitemap-content.ts), from the same loader that
 * prerenders the shop pages, and worker.ts passes them to lib/worker/sitemaps.ts. Build-time only:
 * the Worker bundle never imports this file.
 */
import { getPaginationPages } from '../directory-pagination'
import { getShopPageHref, SHOP_PAGE_SIZE } from '../shop-loader'
import { lastmodDate, latestDate, type SitemapContent, type SitemapEntry } from './sitemaps'

/** A shop article as `getShopPosts()` (lib/shop-loader.ts) returns it. */
export interface ShopPostSummary {
  /** The canonical path, `/shop/best/<slug>/`. */
  slug: string
  /** `publishDate` from the frontmatter. */
  date: string
}

/**
 * Only printable ASCII paths. The Worker answers 404 for the two articles whose slugs have
 * non-ASCII letters (`brümate-water-bottles`, `nestlé-water-bottles`; apps/e2e parity allowlist),
 * so a sitemap must not list them until they are served.
 */
export function isServedShopPath(path: string): boolean {
  return /^\/shop\/[\x21-\x7e]*$/.test(path)
}

/** The shop group: `/shop/` and its pages as the shop paginates them, then every served article. */
export function shopSitemapEntries(
  posts: ShopPostSummary[],
  pageSize = SHOP_PAGE_SIZE
): SitemapContent {
  const articles: SitemapEntry[] = posts
    .filter(post => isServedShopPath(post.slug))
    .map(post => {
      const lastmod = lastmodDate(post.date)
      return lastmod ? { path: post.slug, lastmod } : { path: post.slug }
    })
  // Every article, served or not, takes a place on the listing, which changes when one is added.
  const newest = latestDate(posts.map(post => lastmodDate(post.date)))
  const listings: SitemapEntry[] = getPaginationPages(posts.length, pageSize).map(page => {
    const path = getShopPageHref(page)
    return newest ? { path, lastmod: newest } : { path }
  })
  return { shop: [...listings, ...articles] }
}
