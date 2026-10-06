import { baseConfig, withAnalyzer } from '@boxingundefeated/config-next'
import { initOpenNextCloudflareForDev } from '@opennextjs/cloudflare'
import type { NextConfig } from 'next'

export const INTERNAL_PACKAGES = [
  '@boxingundefeated/data-ops',
  '@boxingundefeated/design-system',
  '@boxingundefeated/config-next',
  '@boxingundefeated/config-typescript'
]

// `build:worker` sets NEXT_BUILD_TARGET=worker for the OpenNext Worker build. Every other build
// (`build`, `build:vercel`, the GitHub Pages deploy) stays a static export to `out/`.
const isWorkerBuild = process.env.NEXT_BUILD_TARGET === 'worker'

let nextConfig: NextConfig = {
  ...baseConfig,

  output: isWorkerBuild ? undefined : 'export',
  trailingSlash: true,

  // Inlined into the bundles at build time, so lib/site-config.ts can tell the static export (which
  // is production unless SITE_ENVIRONMENT says otherwise) from the Worker, whose runtime has no
  // NEXT_BUILD_TARGET. SITE_ENVIRONMENT itself is not inlined: the Worker reads it per request.
  env: {
    SITE_BUILD_OUTPUT: isWorkerBuild ? 'worker' : 'export'
  },

  // No basePath needed for the boxingundefeated.com custom domain.
  // basePath: process.env.NODE_ENV === 'production' ? '/boxing' : '',
  // assetPrefix: process.env.NODE_ENV === 'production' ? '/boxing' : '',

  transpilePackages: INTERNAL_PACKAGES,

  pageExtensions: ['ts', 'tsx'],

  images: {
    unoptimized: true, // Required for static export
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'boxrec.com',
        pathname: '/**'
      },
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
