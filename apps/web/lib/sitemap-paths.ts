import { getBlogSlugs } from './blog-loader'
import { getBoxerCategories, getBoxersWithoutBouts } from './boxers-loader'
import { getBoxersPageHref, getDivisionPageHref, getPaginationPages } from './directory-pagination'
import { getShopPageHref, getShopPosts, SHOP_PAGE_SIZE } from './shop-loader'
import { normalizeInternalPath, toAbsoluteUrl } from './url-utils'

export { normalizeInternalPath, toAbsoluteUrl }

export interface SitemapPaths {
  pages: string[]
  boxerListings: string[]
  divisionListings: string[]
  boxerDetails: string[]
  blogPosts: string[]
  shopListings: string[]
  shopPosts: string[]
}

export async function getSitemapPaths(): Promise<SitemapPaths> {
  const boxers = getBoxersWithoutBouts()
  const categories = getBoxerCategories()
  const blogPosts = await getBlogSlugs()
  const shopPosts = await getShopPosts()
  const boxerListings = getPaginationPages(boxers.length).map(getBoxersPageHref)
  const shopListings = getPaginationPages(shopPosts.length, SHOP_PAGE_SIZE).map(getShopPageHref)

  const divisionListings = categories.flatMap(category => {
    const divisionCount = boxers.filter(boxer => boxer.proDivision === category.division).length
    return getPaginationPages(divisionCount).map(page => getDivisionPageHref(category.slug, page))
  })

  return {
    pages: ['/', '/about/', '/search/', '/brands/', '/privacy/', '/terms/', '/sitemap/'].map(
      normalizeInternalPath
    ),
    boxerListings: boxerListings.map(normalizeInternalPath),
    divisionListings: ['/divisions/', ...divisionListings].map(normalizeInternalPath),
    boxerDetails: boxers.map(boxer => normalizeInternalPath(`/boxers/${boxer.slug}`)),
    blogPosts: ['/blog/', ...blogPosts].map(normalizeInternalPath),
    shopListings: shopListings.map(normalizeInternalPath),
    shopPosts: shopPosts.map(post => normalizeInternalPath(post.slug))
  }
}
