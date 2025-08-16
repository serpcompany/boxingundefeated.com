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
  const sitemapFiles: string[] = []

  // Generate main sitemap with static pages, categories, and blog posts
  const mainUrls: SitemapURL[] = []

  // Main pages
  mainUrls.push({
    url: baseUrl,
    lastModified,
    changeFrequency: 'daily',
    priority: 1
  })

  mainUrls.push({
    url: `${baseUrl}/boxers`,
    lastModified,
    changeFrequency: 'daily',
    priority: 0.9
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

  // Category pages
  categories.forEach(category => {
    mainUrls.push({
      url: `${baseUrl}/boxers/division/${category.slug}`,
      lastModified,
      changeFrequency: 'weekly',
      priority: 0.8
    })
  })

  // Write main sitemap
  const mainSitemapPath = path.join(outputDir, 'sitemap-main.xml')
  fs.writeFileSync(mainSitemapPath, generateSitemapXML(mainUrls))
  sitemapFiles.push(`${baseUrl}/sitemap-main.xml`)
  console.log(`Generated ${mainSitemapPath} with ${mainUrls.length} URLs`)

  // Generate boxer sitemaps (split into chunks)
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
    sitemapFiles.push(`${baseUrl}/sitemap-boxers-${i + 1}.xml`)
    console.log(`Generated ${boxerSitemapPath} with ${boxerUrls.length} URLs`)
  }

  // Generate sitemap index
  const sitemapIndexPath = path.join(outputDir, 'sitemap.xml')
  fs.writeFileSync(sitemapIndexPath, generateSitemapIndex(sitemapFiles))
  console.log(
    `\nGenerated sitemap index at ${sitemapIndexPath} with ${sitemapFiles.length} sitemaps`
  )

  // Also generate a robots.txt if it doesn't exist
  const robotsPath = path.join(outputDir, 'robots.txt')
  if (!fs.existsSync(robotsPath)) {
    const robotsContent = `User-agent: *
Allow: /

Sitemap: ${baseUrl}/sitemap.xml`
    fs.writeFileSync(robotsPath, robotsContent)
    console.log(`Generated robots.txt`)
  }

  console.log(`\n✅ Sitemap generation complete!`)
  console.log(`   Total boxers: ${boxers.length}`)
  console.log(`   Boxer sitemaps: ${numBoxerSitemaps}`)
  console.log(`   Total sitemaps: ${sitemapFiles.length}`)
}

generateSitemaps().catch(console.error)
