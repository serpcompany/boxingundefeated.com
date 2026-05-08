import { getBlogSlugs } from '@/lib/blog-loader'
import { getBoxerCategories, getBoxersWithoutBouts } from '@/lib/boxers-loader'

// Google recommends max 50,000 URLs per sitemap, but for performance we'll use 1,000
const MAX_URLS_PER_SITEMAP = 1000

function generateSitemapXML(
  urls: Array<{
    url: string
    lastModified: string
    changeFrequency?: string
    priority?: number
  }>
): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls
  .map(
    item => `  <url>
    <loc>${item.url}</loc>
    <lastmod>${item.lastModified}</lastmod>
    ${item.changeFrequency ? `<changefreq>${item.changeFrequency}</changefreq>` : ''}
    ${item.priority ? `<priority>${item.priority}</priority>` : ''}
  </url>`
  )
  .join('\n')}
</urlset>`
}

function generateSitemapIndex(sitemaps: string[]): string {
  const lastModified = new Date().toISOString()
  return `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${sitemaps
  .map(
    sitemap => `  <sitemap>
    <loc>${sitemap}</loc>
    <lastmod>${lastModified}</lastmod>
  </sitemap>`
  )
  .join('\n')}
</sitemapindex>`
}

export async function GET(request: Request) {
  const url = new URL(request.url)
  const pathname = url.pathname

  const baseUrl =
    process.env.NEXT_PUBLIC_SITE_URL ||
    (process.env.NODE_ENV === 'production'
      ? 'https://boxingundefeated.com'
      : 'http://localhost:3003')

  // Check if requesting a specific sitemap
  const sitemapMatch = pathname.match(/sitemap-(\w+)-(\d+)\.xml$/)

  if (sitemapMatch) {
    const [, type, indexStr] = sitemapMatch
    const index = parseInt(indexStr, 10)

    if (type === 'boxers') {
      const boxers = await getBoxersWithoutBouts()
      const start = (index - 1) * MAX_URLS_PER_SITEMAP
      const end = start + MAX_URLS_PER_SITEMAP
      const boxerBatch = boxers.slice(start, end)

      if (boxerBatch.length === 0) {
        return new Response('Sitemap not found', { status: 404 })
      }

      const urls = boxerBatch.map(boxer => ({
        url: `${baseUrl}/boxers/${boxer.slug}`,
        lastModified: new Date().toISOString(),
        changeFrequency: 'monthly',
        priority: 0.6
      }))

      return new Response(generateSitemapXML(urls), {
        headers: {
          'Content-Type': 'application/xml',
          'Cache-Control': 'public, max-age=86400, s-maxage=86400'
        }
      })
    }

    if (type === 'main' && index === 1) {
      // Main sitemap with static pages, categories, and blog posts
      const categories = getBoxerCategories()
      const blogSlugs = await getBlogSlugs()

      const urls = []

      // Main pages
      urls.push({
        url: baseUrl,
        lastModified: new Date().toISOString(),
        changeFrequency: 'daily',
        priority: 1
      })

      urls.push({
        url: `${baseUrl}/boxers`,
        lastModified: new Date().toISOString(),
        changeFrequency: 'daily',
        priority: 0.9
      })

      urls.push({
        url: `${baseUrl}/about`,
        lastModified: new Date().toISOString(),
        changeFrequency: 'monthly',
        priority: 0.5
      })

      urls.push({
        url: `${baseUrl}/search`,
        lastModified: new Date().toISOString(),
        changeFrequency: 'weekly',
        priority: 0.7
      })

      urls.push({
        url: `${baseUrl}/blog`,
        lastModified: new Date().toISOString(),
        changeFrequency: 'weekly',
        priority: 0.8
      })

      // Blog posts
      blogSlugs.forEach(slug => {
        urls.push({
          url: `${baseUrl}${slug}`,
          lastModified: new Date().toISOString(),
          changeFrequency: 'monthly',
          priority: 0.7
        })
      })

      // Category pages
      categories.forEach(category => {
        urls.push({
          url: `${baseUrl}/boxers/division/${category.slug}`,
          lastModified: new Date().toISOString(),
          changeFrequency: 'weekly',
          priority: 0.8
        })
      })

      return new Response(generateSitemapXML(urls), {
        headers: {
          'Content-Type': 'application/xml',
          'Cache-Control': 'public, max-age=86400, s-maxage=86400'
        }
      })
    }
  }

  // Default: return sitemap index
  const boxers = await getBoxersWithoutBouts()
  const numBoxerSitemaps = Math.ceil(boxers.length / MAX_URLS_PER_SITEMAP)

  const sitemaps = [
    `${baseUrl}/sitemap-main-1.xml`,
    ...Array.from({ length: numBoxerSitemaps }, (_, i) => `${baseUrl}/sitemap-boxers-${i + 1}.xml`)
  ]

  return new Response(generateSitemapIndex(sitemaps), {
    headers: {
      'Content-Type': 'application/xml',
      'Cache-Control': 'public, max-age=86400, s-maxage=86400'
    }
  })
}
