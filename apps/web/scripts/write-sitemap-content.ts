/**
 * Records the sitemap entries that come from `content/` (the shop listing and its articles) in
 * `.open-next/sitemap-content.json`. `build:worker` runs it after `opennextjs-cloudflare build`
 * (which empties `.open-next/`). worker.ts imports the file, so a build without it can't be bundled,
 * and the Worker serves the shop sitemap from it (lib/worker/sitemaps.ts): it can't read
 * `content/` on request. Run from apps/web, like the build: lib/shop-loader.ts reads `content/`
 * relative to the working directory.
 */
import { writeFileSync } from 'node:fs'
import path from 'node:path'
import { getShopPosts } from '../lib/shop-loader'
import { shopSitemapEntries } from '../lib/sitemaps/content'

const SITEMAP_CONTENT_FILE = path.join(__dirname, '..', '.open-next', 'sitemap-content.json')

async function main() {
  const posts = await getShopPosts()
  if (posts.length === 0) {
    throw new Error(
      `No shop articles in ${path.join(process.cwd(), 'content')}; run from apps/web.`
    )
  }
  const content = shopSitemapEntries(posts)
  writeFileSync(SITEMAP_CONTENT_FILE, `${JSON.stringify(content)}\n`)
  console.log(`Sitemap content: ${content.shop.length} shop URLs from ${posts.length} articles`)
}

main().catch(error => {
  console.error(error)
  process.exit(1)
})
