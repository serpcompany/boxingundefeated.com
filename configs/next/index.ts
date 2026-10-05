import withBundleAnalyzer from '@next/bundle-analyzer'
import type { NextConfig } from 'next'

const otelRegex = /@opentelemetry\/instrumentation/

export const baseConfig: NextConfig = {
  reactStrictMode: true,

  // Ignore ESLint because we use biome for linting
  eslint: {
    ignoreDuringBuilds: true
  },

  webpack(config, { isServer }) {
    if (isServer) {
      config.plugins = config.plugins || []
    }

    config.ignoreWarnings = [{ module: otelRegex }]

    return config
  },

  skipTrailingSlashRedirect: true
}

export const withAnalyzer = (sourceConfig: NextConfig) => withBundleAnalyzer()(sourceConfig)
