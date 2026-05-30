import { getBlogSlugs } from './blog-loader'
import { getBoxerCategories, getBoxersWithoutBouts } from './boxers-loader'
import { getBoxersPageHref, getDivisionPageHref, getPaginationPages } from './directory-pagination'
import { getShopPageHref, getShopPosts, SHOP_PAGE_SIZE } from './shop-loader'

export interface SitemapPaths {
  main: string[]
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
    main: [
      '/',
      '/about',
      '/search',
      '/blog',
      '/divisions/',
      '/brands/',
      '/privacy',
      '/terms',
      '/sitemap/'
    ],
    boxerListings,
    divisionListings,
    boxerDetails: boxers.map(boxer => `/boxers/${boxer.slug}`),
    blogPosts,
    shopListings,
    shopPosts: shopPosts.map(post => post.slug)
  }
}

export function toAbsoluteUrl(baseUrl: string, pathname: string): string {
  if (pathname === '/') return baseUrl
  return `${baseUrl}${pathname}`
}
