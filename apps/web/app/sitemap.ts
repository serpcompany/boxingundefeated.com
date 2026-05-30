import type { MetadataRoute } from 'next'
import { getSitemapPaths, toAbsoluteUrl } from '@/lib/sitemap-paths'

export const dynamic = 'force-static'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl =
    process.env.NEXT_PUBLIC_SITE_URL ||
    (process.env.NODE_ENV === 'production'
      ? 'https://boxingundefeated.com'
      : 'http://localhost:3000')

  const paths = await getSitemapPaths()
  const lastModified = new Date()
  const urls: MetadataRoute.Sitemap = []

  paths.main.forEach(pathname => {
    urls.push({
      url: toAbsoluteUrl(baseUrl, pathname),
      changeFrequency: 'monthly',
      lastModified,
      priority: pathname === '/' ? 1 : 0.7
    })
  })

  paths.blogPosts.forEach(pathname => {
    urls.push({
      url: toAbsoluteUrl(baseUrl, pathname),
      changeFrequency: 'monthly',
      lastModified,
      priority: 0.7
    })
  })

  paths.boxerListings.forEach(pathname => {
    urls.push({
      url: toAbsoluteUrl(baseUrl, pathname),
      changeFrequency: 'daily',
      lastModified,
      priority: pathname === '/boxers' ? 0.9 : 0.7
    })
  })

  paths.divisionListings.forEach(pathname => {
    urls.push({
      url: toAbsoluteUrl(baseUrl, pathname),
      changeFrequency: 'weekly',
      lastModified,
      priority: 0.8
    })
  })

  paths.boxerDetails.forEach(pathname => {
    urls.push({
      url: toAbsoluteUrl(baseUrl, pathname),
      changeFrequency: 'monthly',
      lastModified,
      priority: 0.6
    })
  })

  return urls
}
