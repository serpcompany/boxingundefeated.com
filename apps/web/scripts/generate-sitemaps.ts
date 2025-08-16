#!/usr/bin/env npx tsx

import fs from 'node:fs'
import path from 'node:path'
import { getBlogSlugs } from '../lib/blog-loader'
import { getBoxerCategories, getBoxersWithoutBouts } from '../lib/boxers-loader'

// Google recommends max 50,000 URLs per sitemap, but for better performance we'll use 2,000
const MAX_URLS_PER_SITEMAP = 2000

const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://boxingundefeated.github.io'
const outputDir = path.join(process.cwd(), 'public')

interface SitemapURL {
  url: string
  lastModified: string
  changeFrequency?: string
  priority?: number
}

function generateSitemapXML(urls: SitemapURL[]): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls
  .map(
    item => `  <url>
    <loc>${item.url}</loc>
    <lastmod>${item.lastModified}</lastmod>${
      item.changeFrequency
        ? `
    <changefreq>${item.changeFrequency}</changefreq>`
        : ''
    }${
      item.priority !== undefined
        ? `
    <priority>${item.priority}</priority>`
        : ''
    }
  </url>`
  )
  .join('\n')}
</urlset>`
}

function generateSitemapIndex(sitemaps: string[]): string {
  const lastModified = new Date().toISOString().split('T')[0]
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

async function generateSitemaps() {
  console.log('Generating sitemaps...')

  const boxers = getBoxersWithoutBouts()
  const categories = getBoxerCategories()
  const blogSlugs = await getBlogSlugs()

  const lastModified = new Date().toISOString().split('T')[0]

  // ===== MAIN CONTENT SITEMAP =====
  const mainUrls: SitemapURL[] = []

  // Main pages
  mainUrls.push({
    url: baseUrl,
    lastModified,
    changeFrequency: 'daily',
    priority: 1
  })

  mainUrls.push({
    url: `${baseUrl}/about`,
    lastModified,
    changeFrequency: 'monthly',
    priority: 0.5
  })

  mainUrls.push({
    url: `${baseUrl}/search`,
    lastModified,
    changeFrequency: 'weekly',
    priority: 0.7
  })

  mainUrls.push({
    url: `${baseUrl}/blog`,
    lastModified,
    changeFrequency: 'weekly',
    priority: 0.8
  })

  // Blog posts
  blogSlugs.forEach(slug => {
    mainUrls.push({
      url: `${baseUrl}${slug}`,
      lastModified,
      changeFrequency: 'monthly',
      priority: 0.7
    })
  })

  // Write main content sitemap
  const mainSitemapPath = path.join(outputDir, 'sitemap-main.xml')
  fs.writeFileSync(mainSitemapPath, generateSitemapXML(mainUrls))
  console.log(`Generated ${mainSitemapPath} with ${mainUrls.length} URLs`)

  // ===== BOXERS SITEMAP INDEX =====
  const boxerSitemaps: string[] = []

  // Add boxers landing page and divisions to first boxers sitemap
  const boxersMainUrls: SitemapURL[] = []

  boxersMainUrls.push({
    url: `${baseUrl}/boxers`,
    lastModified,
    changeFrequency: 'daily',
    priority: 0.9
  })

  // Division pages (now at /divisions/*)
  categories.forEach(category => {
    boxersMainUrls.push({
      url: `${baseUrl}/divisions/${category.slug}`,
      lastModified,
      changeFrequency: 'weekly',
      priority: 0.8
    })
  })

  // Write boxers main sitemap
  const boxersMainSitemapPath = path.join(outputDir, 'sitemap-boxers-main.xml')
  fs.writeFileSync(boxersMainSitemapPath, generateSitemapXML(boxersMainUrls))
  boxerSitemaps.push(`${baseUrl}/sitemap-boxers-main.xml`)
  console.log(`Generated ${boxersMainSitemapPath} with ${boxersMainUrls.length} URLs`)

  // Generate individual boxer sitemaps (split into chunks)
  const numBoxerSitemaps = Math.ceil(boxers.length / MAX_URLS_PER_SITEMAP)

  for (let i = 0; i < numBoxerSitemaps; i++) {
    const start = i * MAX_URLS_PER_SITEMAP
    const end = Math.min(start + MAX_URLS_PER_SITEMAP, boxers.length)
    const boxerBatch = boxers.slice(start, end)

    const boxerUrls: SitemapURL[] = boxerBatch.map(boxer => ({
      url: `${baseUrl}/boxers/${boxer.slug}`,
      lastModified,
      changeFrequency: 'monthly',
      priority: 0.6
    }))

    const boxerSitemapPath = path.join(outputDir, `sitemap-boxers-${i + 1}.xml`)
    fs.writeFileSync(boxerSitemapPath, generateSitemapXML(boxerUrls))
    boxerSitemaps.push(`${baseUrl}/sitemap-boxers-${i + 1}.xml`)
    console.log(`Generated ${boxerSitemapPath} with ${boxerUrls.length} URLs`)
  }

  // Generate boxers sitemap index
  const boxersSitemapIndexPath = path.join(outputDir, 'sitemap-index-boxers.xml')
  fs.writeFileSync(boxersSitemapIndexPath, generateSitemapIndex(boxerSitemaps))
  console.log(
    `\nGenerated boxers sitemap index at ${boxersSitemapIndexPath} with ${boxerSitemaps.length} sitemaps`
  )

  // ===== SHOP SITEMAP INDEX (placeholder for now) =====
  const shopUrls: SitemapURL[] = []

  // Add shop landing page (when it exists)
  shopUrls.push({
    url: `${baseUrl}/shop`,
    lastModified,
    changeFrequency: 'weekly',
    priority: 0.8
  })

  // Write shop sitemap
  const shopSitemapPath = path.join(outputDir, 'sitemap-shop.xml')
  fs.writeFileSync(shopSitemapPath, generateSitemapXML(shopUrls))
  console.log(`Generated ${shopSitemapPath} with ${shopUrls.length} URLs`)

  // Generate shop sitemap index
  const shopSitemapIndexPath = path.join(outputDir, 'sitemap-index-shop.xml')
  fs.writeFileSync(shopSitemapIndexPath, generateSitemapIndex([`${baseUrl}/sitemap-shop.xml`]))
  console.log(`Generated shop sitemap index at ${shopSitemapIndexPath}`)

  // ===== MASTER SITEMAP INDEX =====
  const masterSitemaps = [
    `${baseUrl}/sitemap-main.xml`,
    `${baseUrl}/sitemap-index-boxers.xml`,
    `${baseUrl}/sitemap-index-shop.xml`
  ]

  const sitemapIndexPath = path.join(outputDir, 'sitemap.xml')
  fs.writeFileSync(sitemapIndexPath, generateSitemapIndex(masterSitemaps))
  console.log(
    `\nGenerated master sitemap index at ${sitemapIndexPath} with ${masterSitemaps.length} indexes`
  )

  // Update robots.txt
  const robotsPath = path.join(outputDir, 'robots.txt')
  const robotsContent = `User-agent: *
Allow: /

# Main sitemap index
Sitemap: ${baseUrl}/sitemap.xml

# Section-specific sitemap indexes
Sitemap: ${baseUrl}/sitemap-index-boxers.xml
Sitemap: ${baseUrl}/sitemap-index-shop.xml`

  fs.writeFileSync(robotsPath, robotsContent)
  console.log(`Updated robots.txt with all sitemap indexes`)

  console.log(`\n✅ Sitemap generation complete!`)
  console.log(`   Total boxers: ${boxers.length}`)
  console.log(`   Boxer sitemaps: ${numBoxerSitemaps + 1} (including main)`)
  console.log(`   Total sitemap files: ${3 + boxerSitemaps.length + 1}`)
}

generateSitemaps().catch(console.error)
