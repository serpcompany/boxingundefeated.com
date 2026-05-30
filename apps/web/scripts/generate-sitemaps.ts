#!/usr/bin/env npx tsx

import fs from 'node:fs'
import path from 'node:path'
import { getBoxersWithoutBouts } from '../lib/boxers-loader'
import { getSitemapPaths, toAbsoluteUrl } from '../lib/sitemap-paths'

// Google recommends max 50,000 URLs per sitemap, but for better performance we'll use 2,000
const MAX_URLS_PER_SITEMAP = 2000

const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://boxingundefeated.com'
const publicDir = path.join(process.cwd(), 'public')
const staticExportDir = path.join(process.cwd(), 'out')

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

function getOutputDirs(): string[] {
  return fs.existsSync(staticExportDir) ? [publicDir, staticExportDir] : [publicDir]
}

function writeGeneratedFile(fileName: string, content: string): string {
  const outputDirs = getOutputDirs()

  for (const outputDir of outputDirs) {
    fs.writeFileSync(path.join(outputDir, fileName), content)
  }

  return path.join(outputDirs[0], fileName)
}

function writeStaticExportDirectoryFallback(routeName: string): void {
  if (!fs.existsSync(staticExportDir)) return

  const sourcePath = path.join(staticExportDir, `${routeName}.html`)
  if (!fs.existsSync(sourcePath)) return

  const routeDir = path.join(staticExportDir, routeName)
  fs.mkdirSync(routeDir, { recursive: true })
  fs.copyFileSync(sourcePath, path.join(routeDir, 'index.html'))
}

async function generateSitemaps() {
  console.log('Generating sitemaps...')

  const boxers = getBoxersWithoutBouts()
  const sitemapPaths = await getSitemapPaths()

  const lastModified = new Date().toISOString().split('T')[0]

  // ===== MAIN CONTENT SITEMAP =====
  const mainUrls: SitemapURL[] = []

  sitemapPaths.main.forEach(pathname => {
    mainUrls.push({
      url: toAbsoluteUrl(baseUrl, pathname),
      lastModified,
      changeFrequency: pathname === '/' ? 'daily' : 'monthly',
      priority: pathname === '/' ? 1 : 0.7
    })
  })

  sitemapPaths.blogPosts.forEach(pathname => {
    mainUrls.push({
      url: toAbsoluteUrl(baseUrl, pathname),
      lastModified,
      changeFrequency: 'monthly',
      priority: 0.7
    })
  })

  // Write main content sitemap
  const mainSitemapPath = writeGeneratedFile('sitemap-main.xml', generateSitemapXML(mainUrls))
  console.log(`Generated ${mainSitemapPath} with ${mainUrls.length} URLs`)

  // ===== BOXERS SITEMAP INDEX =====
  const boxerSitemaps: string[] = []

  // Add boxers landing page and divisions to first boxers sitemap
  const boxersMainUrls: SitemapURL[] = []

  sitemapPaths.boxerListings.forEach(pathname => {
    boxersMainUrls.push({
      url: toAbsoluteUrl(baseUrl, pathname),
      lastModified,
      changeFrequency: 'daily',
      priority: pathname === '/boxers' ? 0.9 : 0.7
    })
  })

  sitemapPaths.divisionListings.forEach(pathname => {
    boxersMainUrls.push({
      url: toAbsoluteUrl(baseUrl, pathname),
      lastModified,
      changeFrequency: 'weekly',
      priority: 0.8
    })
  })

  // Write boxers main sitemap
  const boxersMainSitemapPath = writeGeneratedFile(
    'sitemap-boxers-main.xml',
    generateSitemapXML(boxersMainUrls)
  )
  boxerSitemaps.push(`${baseUrl}/sitemap-boxers-main.xml`)
  console.log(`Generated ${boxersMainSitemapPath} with ${boxersMainUrls.length} URLs`)

  // Generate individual boxer sitemaps (split into chunks)
  const numBoxerSitemaps = Math.ceil(boxers.length / MAX_URLS_PER_SITEMAP)

  for (let i = 0; i < numBoxerSitemaps; i++) {
    const start = i * MAX_URLS_PER_SITEMAP
    const end = Math.min(start + MAX_URLS_PER_SITEMAP, boxers.length)
    const boxerBatch = boxers.slice(start, end)

    const boxerUrls: SitemapURL[] = boxerBatch.map(boxer => ({
      url: toAbsoluteUrl(baseUrl, `/boxers/${boxer.slug}`),
      lastModified,
      changeFrequency: 'monthly',
      priority: 0.6
    }))

    const boxerSitemapPath = writeGeneratedFile(
      `sitemap-boxers-${i + 1}.xml`,
      generateSitemapXML(boxerUrls)
    )
    boxerSitemaps.push(`${baseUrl}/sitemap-boxers-${i + 1}.xml`)
    console.log(`Generated ${boxerSitemapPath} with ${boxerUrls.length} URLs`)
  }

  // Generate boxers sitemap index
  const boxersSitemapIndexPath = writeGeneratedFile(
    'sitemap-index-boxers.xml',
    generateSitemapIndex(boxerSitemaps)
  )
  console.log(
    `\nGenerated boxers sitemap index at ${boxersSitemapIndexPath} with ${boxerSitemaps.length} sitemaps`
  )

  // ===== SHOP SITEMAP INDEX =====
  const shopUrls: SitemapURL[] = []

  sitemapPaths.shopListings.forEach(pathname => {
    shopUrls.push({
      url: toAbsoluteUrl(baseUrl, pathname),
      lastModified,
      changeFrequency: 'weekly',
      priority: pathname === '/shop' ? 0.8 : 0.6
    })
  })

  sitemapPaths.shopPosts.forEach(pathname => {
    shopUrls.push({
      url: toAbsoluteUrl(baseUrl, pathname),
      lastModified,
      changeFrequency: 'monthly',
      priority: 0.6
    })
  })

  // Write shop sitemap
  const shopSitemapPath = writeGeneratedFile('sitemap-shop.xml', generateSitemapXML(shopUrls))
  console.log(`Generated ${shopSitemapPath} with ${shopUrls.length} URLs`)

  // Generate shop sitemap index
  const shopSitemapIndexPath = writeGeneratedFile(
    'sitemap-index-shop.xml',
    generateSitemapIndex([`${baseUrl}/sitemap-shop.xml`])
  )
  console.log(`Generated shop sitemap index at ${shopSitemapIndexPath}`)

  // ===== MASTER SITEMAP INDEX =====
  const masterSitemaps = [
    `${baseUrl}/sitemap-main.xml`,
    `${baseUrl}/sitemap-index-boxers.xml`,
    `${baseUrl}/sitemap-index-shop.xml`
  ]

  const sitemapIndexPath = writeGeneratedFile('sitemap.xml', generateSitemapIndex(masterSitemaps))
  console.log(
    `\nGenerated master sitemap index at ${sitemapIndexPath} with ${masterSitemaps.length} indexes`
  )

  // Update robots.txt
  const robotsContent = `User-agent: *
Allow: /

# Main sitemap index
Sitemap: ${baseUrl}/sitemap.xml

# Section-specific sitemap indexes
Sitemap: ${baseUrl}/sitemap-index-boxers.xml
Sitemap: ${baseUrl}/sitemap-index-shop.xml`

  writeGeneratedFile('robots.txt', robotsContent)
  console.log(`Updated robots.txt with all sitemap indexes`)

  writeStaticExportDirectoryFallback('sitemap')
  console.log(`Updated static export fallback for /sitemap/`)

  console.log(`\n✅ Sitemap generation complete!`)
  console.log(`   Total boxers: ${boxers.length}`)
  console.log(`   Boxer sitemaps: ${numBoxerSitemaps + 1} (including main)`)
  console.log(`   Total sitemap files: ${3 + boxerSitemaps.length + 1}`)
}

generateSitemaps().catch(console.error)
