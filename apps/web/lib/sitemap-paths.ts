import { getBlogSlugs } from './blog-loader'
import { getBoxerCategories, getBoxersWithoutBouts } from './boxers-loader'
import { getBoxersPageHref, getDivisionPageHref, getPaginationPages } from './directory-pagination'

export interface SitemapPaths {
  main: string[]
  boxerListings: string[]
  divisionListings: string[]
  boxerDetails: string[]
  blogPosts: string[]
}

export async function getSitemapPaths(): Promise<SitemapPaths> {
  const boxers = getBoxersWithoutBouts()
  const categories = getBoxerCategories()
  const blogPosts = await getBlogSlugs()
  const boxerListings = getPaginationPages(boxers.length).map(getBoxersPageHref)

  const divisionListings = categories.flatMap(category => {
    const divisionCount = boxers.filter(boxer => boxer.proDivision === category.division).length
    return getPaginationPages(divisionCount).map(page => getDivisionPageHref(category.slug, page))
  })

  return {
    main: ['/', '/about', '/search', '/blog', '/privacy', '/terms', '/sitemap/'],
    boxerListings,
    divisionListings,
    boxerDetails: boxers.map(boxer => `/boxers/${boxer.slug}`),
    blogPosts
  }
}

export function toAbsoluteUrl(baseUrl: string, pathname: string): string {
  if (pathname === '/') return baseUrl
  return `${baseUrl}${pathname}`
}
