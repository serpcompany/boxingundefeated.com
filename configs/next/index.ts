import withBundleAnalyzer from '@next/bundle-analyzer'
import type { NextConfig } from 'next'

export const baseConfig: NextConfig = {
  reactStrictMode: true,

  skipTrailingSlashRedirect: true
}

// @next/bundle-analyzer is a webpack plugin, so `pnpm analyze` builds with `--webpack`.
export const withAnalyzer = (sourceConfig: NextConfig) => withBundleAnalyzer()(sourceConfig)
