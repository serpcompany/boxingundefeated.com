import { baseConfig, withAnalyzer, withVercelToolbarConfig } from '@boxingundefeated/config-next'
import withMDX from '@next/mdx'
import type { NextConfig } from 'next'
import { env } from '@/env'

export const INTERNAL_PACKAGES = [
  '@boxingundefeated/design-system',
  // '@boxingundefeated/auth', // Removed - contains server actions incompatible with static export
  // '@boxingundefeated/caching', // Removed - Redis/Upstash not needed for static site
  '@boxingundefeated/config-next',
  '@boxingundefeated/config-typescript',
  // '@boxingundefeated/supabase', // Removed - not needed for static boxing site
  '@boxingundefeated/utils',
  '@boxingundefeated/content'
]

let nextConfig: NextConfig = {
  ...baseConfig,

  // Always use static export to avoid serverless function size limits
  output: 'export',

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
        hostname: 'www.google.com',
        pathname: '/s2/favicons/**'
      },
      {
        protocol: 'https',
        hostname: 'avatars.githubusercontent.com',
        pathname: '/u/**'
      },
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

// Apply other plugins first
nextConfig = withVercelToolbarConfig(nextConfig)
nextConfig = withMDX()(nextConfig)

if (env.ANALYZE === 'true') {
  nextConfig = withAnalyzer(nextConfig)
}

export default nextConfig
