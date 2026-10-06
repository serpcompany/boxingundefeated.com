import { defineCloudflareConfig } from '@opennextjs/cloudflare'
import staticAssetsIncrementalCache from '@opennextjs/cloudflare/overrides/incremental-cache/static-assets-incremental-cache'

// Interim data path, until the D1 issues (#10, #11) render pages on request: every route that
// reads JSON or markdown with `fs` is fully prerendered at build (`dynamicParams = false`), and
// nothing revalidates. The Worker serves those prerendered pages from its static assets, because
// `fs` can't read the repository at request time.
export default {
  ...defineCloudflareConfig({
    incrementalCache: staticAssetsIncrementalCache,
    enableCacheInterception: true
  }),
  // The package `build` script is the GitHub Pages export (it also rewrites the sitemaps), so
  // OpenNext runs `next build` directly. `build:worker` sets NEXT_BUILD_TARGET=worker, which turns
  // off `output: 'export'` in next.config.ts.
  buildCommand: 'pnpm exec next build'
}
