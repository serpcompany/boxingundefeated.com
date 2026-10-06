import { defineCloudflareConfig } from '@opennextjs/cloudflare'
import staticAssetsIncrementalCache from '@opennextjs/cloudflare/overrides/incremental-cache/static-assets-incremental-cache'

// Boxer pages (profiles, listings, divisions, the homepage, the HTML sitemap) render on request
// from D1 and are cached by worker.ts's edge cache (lib/worker/edge-cache.ts), not by OpenNext.
// Every other route reads markdown or JSON with `fs`, is fully prerendered at build, and never
// revalidates: the Worker serves those pages from its static assets, because `fs` can't read the
// repository at request time. This read-only cache never stores a page rendered on request.
export default {
  ...defineCloudflareConfig({
    incrementalCache: staticAssetsIncrementalCache,
    enableCacheInterception: true
  }),
  // The package `build` script is the static export (kept for CI's link check until #20), so
  // OpenNext runs `next build` directly. `build:worker` sets NEXT_BUILD_TARGET=worker, which turns
  // off `output: 'export'` in next.config.ts.
  buildCommand: 'pnpm exec next build'
}
