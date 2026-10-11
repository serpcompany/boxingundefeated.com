import { baseConfig, withAnalyzer } from '@boxingundefeated/config-next'
import { initOpenNextCloudflareForDev } from '@opennextjs/cloudflare'
import type { NextConfig } from 'next'
import { slashRedirects } from './lib/routing/trailing-slash'

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

  transpilePackages: INTERNAL_PACKAGES,

  pageExtensions: ['ts', 'tsx'],

  images: {
    // Served as they are: the Worker has no image optimization. Boxer photos (/photos/, from R2)
    // are plain <img> tags; `next/image` loads only the footer's DR badge.
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
