import { baseConfig, withAnalyzer } from '@boxingundefeated/config-next'
import withMDX from '@next/mdx'
import type { NextConfig } from 'next'
import { env } from '@/env'

export const INTERNAL_PACKAGES = [
  '@boxingundefeated/design-system',
  '@boxingundefeated/config-next',
  '@boxingundefeated/config-typescript',
  '@boxingundefeated/utils'
]

let nextConfig: NextConfig = {
  ...baseConfig,

  // Always use static export to avoid serverless function size limits
  output: 'export',
  trailingSlash: true,

  // No basePath needed for the boxingundefeated.com custom domain.
  // basePath: process.env.NODE_ENV === 'production' ? '/boxing' : '',
  // assetPrefix: process.env.NODE_ENV === 'production' ? '/boxing' : '',

  transpilePackages: INTERNAL_PACKAGES,

  pageExtensions: ['mdx', 'ts', 'tsx'],

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

nextConfig = withMDX()(nextConfig)

if (env.ANALYZE === 'true') {
  nextConfig = withAnalyzer(nextConfig)
}

export default nextConfig
