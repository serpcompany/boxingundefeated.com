/**
 * The sitemap entries that come from `content/`, not from D1: `/shop/`, its pages and every shop
 * article. The Worker can't read `content/` on request, so `build:worker` records them in
 * `.open-next/sitemap-content.json` (scripts/write-sitemap-content.ts), from the same loader that
 * prerenders the shop pages, and worker.ts passes them to lib/worker/sitemaps.ts. Build-time only:
 * the Worker bundle never imports this file.
 */
import { getPaginationPages } from '../directory-pagination'
import { encodePath } from '../routing/non-ascii-paths'
import { getShopPageHref, SHOP_PAGE_SIZE } from '../shop-loader'
import { lastmodDate, latestDate, type SitemapContent, type SitemapEntry } from './sitemaps'

/** A shop article as `getShopPosts()` (lib/shop-loader.ts) returns it. */
export interface ShopPostSummary {
  /** The canonical path, `/shop/best/<slug>/`, decoded. */
  slug: string
  /** `publishDate` from the frontmatter. */
  date: string
}

/**
 * The shop group: `/shop/` and its pages as the shop paginates them, then every article. A path
 * with non-ASCII letters is listed in its canonical spelling, percent-encoded NFC
 * (`/shop/best/br%C3%BCmate-water-bottles/`, lib/routing/non-ascii-paths.ts).
 */
export function shopSitemapEntries(
  posts: ShopPostSummary[],
  pageSize = SHOP_PAGE_SIZE
): SitemapContent {
  const articles: SitemapEntry[] = posts.map(post => {
    const path = encodePath(post.slug)
    const lastmod = lastmodDate(post.date)
    return lastmod ? { path, lastmod } : { path }
  })
  // Every article takes a place on the listing, which changes when one is added.
  const newest = latestDate(posts.map(post => lastmodDate(post.date)))
  const listings: SitemapEntry[] = getPaginationPages(posts.length, pageSize).map(page => {
    const path = getShopPageHref(page)
    return newest ? { path, lastmod: newest } : { path }
  })
  return { shop: [...listings, ...articles] }
}
