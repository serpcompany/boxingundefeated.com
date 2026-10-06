#!/usr/bin/env npx tsx

import fs from 'node:fs'
import path from 'node:path'
import { getSiteConfig, readSiteConfigInput } from '../lib/site-config'
import { getSitemapPaths, toAbsoluteUrl } from '../lib/sitemap-paths'

// Google recommends max 50,000 URLs per sitemap, but for better performance we'll use 2,000
const MAX_URLS_PER_SITEMAP = 2000

// This script runs only as the last step of the static export (`build`, `build:vercel`), so it
// resolves the environment as that build does (lib/site-config.ts).
const baseUrl = getSiteConfig({
  ...readSiteConfigInput(),
  buildOutput: 'export',
  nodeEnv: 'production'
}).origin
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
    const targetPath = path.join(outputDir, fileName)
    fs.mkdirSync(path.dirname(targetPath), { recursive: true })
    fs.writeFileSync(targetPath, content)
  }

  return path.join(outputDirs[0], fileName)
}

function chunkUrls(urls: SitemapURL[]): SitemapURL[][] {
  const chunks: SitemapURL[][] = []

  for (let start = 0; start < urls.length; start += MAX_URLS_PER_SITEMAP) {
    chunks.push(urls.slice(start, start + MAX_URLS_PER_SITEMAP))
  }

  return chunks
}

function buildUrl(
  pathname: string,
  lastModified: string,
  changeFrequency: string,
  priority: number
): SitemapURL {
  return {
    url: toAbsoluteUrl(baseUrl, pathname),
    lastModified,
    changeFrequency,
    priority
  }
}

async function generateSitemaps() {
  console.log('Generating sitemaps...')

  const sitemapPaths = await getSitemapPaths()

  const lastModified = new Date().toISOString().split('T')[0]

  const sitemapGroups = [
    {
      name: 'pages',
      urls: sitemapPaths.pages.map(pathname =>
        buildUrl(
          pathname,
          lastModified,
          pathname === '/' ? 'daily' : 'monthly',
          pathname === '/' ? 1 : 0.7
        )
      )
    },
    {
      name: 'blog',
      urls: sitemapPaths.blogPosts.map(pathname =>
        buildUrl(pathname, lastModified, 'monthly', pathname === '/blog/' ? 0.8 : 0.7)
      )
    },
    {
      name: 'divisions',
      urls: sitemapPaths.divisionListings.map(pathname =>
        buildUrl(pathname, lastModified, 'weekly', pathname === '/divisions/' ? 0.8 : 0.7)
      )
    },
    {
      name: 'shop',
      urls: [...sitemapPaths.shopListings, ...sitemapPaths.shopPosts].map(pathname =>
        buildUrl(
          pathname,
          lastModified,
          pathname.startsWith('/shop/page/') ? 'weekly' : 'monthly',
          pathname === '/shop/' ? 0.8 : 0.6
        )
      )
    },
    {
      name: 'boxers',
      urls: [...sitemapPaths.boxerListings, ...sitemapPaths.boxerDetails].map(pathname =>
        buildUrl(
          pathname,
          lastModified,
          pathname.startsWith('/boxers/page/') ? 'daily' : 'monthly',
          pathname === '/boxers/' ? 0.9 : 0.6
        )
      )
    }
  ]

  const childSitemaps: string[] = []
  let totalUrlCount = 0

  for (const group of sitemapGroups) {
    const chunks = chunkUrls(group.urls)

    for (const [index, urls] of chunks.entries()) {
      const sitemapPathname = `/sitemaps/${group.name}/${index + 1}.xml`
      const outputPath = writeGeneratedFile(
        sitemapPathname.replace(/^\//, ''),
        generateSitemapXML(urls)
      )

      childSitemaps.push(toAbsoluteUrl(baseUrl, sitemapPathname))
      totalUrlCount += urls.length
      console.log(`Generated ${outputPath} with ${urls.length} URLs`)
    }
  }

  const sitemapIndexXml = generateSitemapIndex(childSitemaps)
  const sitemapIndexPath = writeGeneratedFile('sitemap-index.xml', sitemapIndexXml)
  const sitemapAliasPath = writeGeneratedFile('sitemap.xml', sitemapIndexXml)

  console.log(`\nGenerated sitemap index at ${sitemapIndexPath}`)
  console.log(`Generated compatibility sitemap alias at ${sitemapAliasPath}`)

  console.log('\nSitemap generation complete')
  console.log(`   Total URLs: ${totalUrlCount}`)
  console.log(`   Child sitemap files: ${childSitemaps.length}`)
}

generateSitemaps().catch(console.error)
