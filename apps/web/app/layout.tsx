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

export default function RootLayout({ children }: RootLayoutProps) {
  // Google Tag Manager loads only in production (lib/site-config.ts).
  const { gtmId } = getSiteConfig()

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
      </body>
    </html>
  )
}
