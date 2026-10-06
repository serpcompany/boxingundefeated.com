/**
 * Prints every page URL the sitemaps of `<origin>` list, one per line, on `<origin>` itself (a
 * local preview's sitemaps can list the production origin). CI's link check feeds them to lychee
 * (`lychee.toml`).
 *
 * Usage, from the repository root:
 *   pnpm --filter e2e sitemap-urls <origin> > urls.txt
 */
import { resolve } from 'node:path'
import { sitemapPaths } from './parity'

async function main() {
  const [argument] = process.argv.slice(2).filter(arg => arg !== '--')
  if (!argument) throw new Error('Usage: pnpm --filter e2e sitemap-urls <origin>')
  const origin = new URL(argument).origin
  const paths = (await sitemapPaths(origin)).sort()
  if (paths.length === 0) throw new Error(`${origin}/sitemap-index.xml lists no pages.`)
  process.stdout.write(paths.map(path => `${origin}${path}\n`).join(''))
  console.error(`${paths.length} URLs from ${origin}/sitemap-index.xml`)
}

if (process.argv[1] && resolve(process.argv[1]) === import.meta.filename) {
  main().catch(error => {
    console.error(error instanceof Error ? error.message : error)
    process.exit(1)
  })
}
