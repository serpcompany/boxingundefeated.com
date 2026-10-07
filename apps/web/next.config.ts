import { baseConfig, withAnalyzer } from '@boxingundefeated/config-next'
import { initOpenNextCloudflareForDev } from '@opennextjs/cloudflare'
import type { NextConfig } from 'next'
import { slashRedirects } from './lib/routing/trailing-slash'
import { countShopPosts } from './lib/shop-loader'

export const INTERNAL_PACKAGES = [
  '@boxingundefeated/data-ops',
  '@boxingundefeated/design-system',
  '@boxingundefeated/config-next',
  '@boxingundefeated/config-typescript'
]

let nextConfig: NextConfig = {
  ...baseConfig,

  // Pages end in a slash and files never do (SERP URL trailing-slash standard). The built-in
  // redirect is off (`skipTrailingSlashRedirect` in the shared base config); the Worker applies
  // the standard's rules in `redirects()` instead.
  trailingSlash: true,
  redirects: async () => [...slashRedirects],

  env: {
    // The Worker renders the HTML sitemap on request, from D1, and can't read `content/` then, so
    // its shop pagination comes from the count taken here (lib/shop-loader.ts).
    SHOP_POST_COUNT: String(countShopPosts())
  },

  transpilePackages: INTERNAL_PACKAGES,

  pageExtensions: ['ts', 'tsx'],

  images: {
    // Served as they are: the Worker has no image optimization. Boxer avatars (boxrec.com) are
    // plain <img> tags; `next/image` loads only the footer's DR badge.
    unoptimized: true,
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'dr.serp.co',
        pathname: '/badge/**'
      }
    ]
  }
}

if (process.env.ANALYZE === 'true') {
  nextConfig = withAnalyzer(nextConfig)
}

// Gives `next dev` the Worker bindings from wrangler.jsonc (top level, local) through
// `getCloudflareContext()`. Builds don't need it.
if (process.env.NODE_ENV === 'development') {
  initOpenNextCloudflareForDev()
}

export default nextConfig
