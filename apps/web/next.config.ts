import { baseConfig, withAnalyzer } from '@boxingundefeated/config-next'
import { initOpenNextCloudflareForDev } from '@opennextjs/cloudflare'
import type { NextConfig } from 'next'
import { slashRedirects } from './lib/routing/trailing-slash'
import { browserSentryBuildEnv } from './lib/sentry/options'
import { countShopPosts } from './lib/shop-loader'
import { getSiteConfig } from './lib/site-config'
import { buildRelease } from './scripts/build-stamp'

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
    SHOP_POST_COUNT: String(countShopPosts()),
    // Browser Sentry (lib/sentry/browser.ts): the build's SENTRY_DSN, environment and release, set
    // only for a staging or production build with a DSN (the deploy workflows pass the GitHub
    // variable SENTRY_DSN, which the owner supplies). Otherwise they are empty strings and no
    // Sentry code reaches the browser.
    ...browserSentryBuildEnv({
      dsn: process.env.SENTRY_DSN,
      siteEnvironment: getSiteConfig().environment,
      release: buildRelease
    })
  },

  // Browser source maps exist only for the deploy's Sentry upload (scripts/sentry-release.sh),
  // which deletes them from the assets before deploying, so they are never served.
  productionBrowserSourceMaps: process.env.SENTRY_SOURCEMAPS === 'true',

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
