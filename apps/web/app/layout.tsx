import type { Metadata } from 'next'
import type React from 'react'
import '../../../packages/design-system/styles/globals.css'
import { fontVariable } from '@boxingundefeated/design-system/lib/fonts'
import { cn } from '@boxingundefeated/design-system/lib/utils'
import { DesignSystemProvider } from '@boxingundefeated/design-system/theme-provider'
import { GoogleTagManager, GTMNoscript } from '@/components/gtm'
import { Footer } from '@/components/layout/footer'
import { Header } from '@/components/layout/header'
import { ProgressBar } from '@/components/progress-bar'
import { createRootMetadata } from '@/lib/metadata'
import { getSiteConfig } from '@/lib/site-config'

export function generateMetadata(): Metadata {
  return createRootMetadata(getSiteConfig())
}

type RootLayoutProps = {
  children: React.ReactNode
}

/**
 * The Cloudflare Web Analytics beacon, at the end of `<body>` where Cloudflare's own injection
 * puts it. `defer` runs it once the document is parsed, so it never blocks rendering, and a page
 * works the same when a browser blocks it or it fails to load.
 */
function CloudflareWebAnalytics({ token }: { token: string }) {
  return (
    <script
      defer
      src="https://static.cloudflareinsights.com/beacon.min.js"
      data-cf-beacon={JSON.stringify({ token })}
    />
  )
}

export default function RootLayout({ children }: RootLayoutProps) {
  // Google Tag Manager and Cloudflare Web Analytics load only in production (lib/site-config.ts).
  const { gtmId, cloudflareWebAnalyticsToken } = getSiteConfig()

  return (
    <html lang="en" suppressHydrationWarning className={fontVariable}>
      <head>{gtmId && <GoogleTagManager gtmId={gtmId} />}</head>
      <body className={cn('touch-manipulation font-sans antialiased')}>
        {gtmId && <GTMNoscript gtmId={gtmId} />}
        <DesignSystemProvider>
          <ProgressBar />
          <div className="flex min-h-screen flex-col">
            <Header />
            <main className="flex-1">{children}</main>
            <Footer />
          </div>
        </DesignSystemProvider>
        {cloudflareWebAnalyticsToken && (
          <CloudflareWebAnalytics token={cloudflareWebAnalyticsToken} />
        )}
      </body>
    </html>
  )
}
