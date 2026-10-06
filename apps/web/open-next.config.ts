import { defineCloudflareConfig } from '@opennextjs/cloudflare'
import staticAssetsIncrementalCache from '@opennextjs/cloudflare/overrides/incremental-cache/static-assets-incremental-cache'

// Boxer profiles render on request from D1 (#10) and are cached by worker.ts's edge cache
// (lib/worker/edge-cache.ts), not by OpenNext. Every other route that reads JSON or markdown with
// `fs` is still fully prerendered at build, until #11 moves the listings to D1, and nothing
// revalidates: the Worker serves those pages from its static assets, because `fs` can't read the
// repository at request time. This read-only cache never stores a page rendered on request.
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
