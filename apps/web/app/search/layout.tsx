import type { Metadata } from 'next'
import type React from 'react'
import { createPageMetadata } from '@/lib/metadata'

// The search page is a client component, so its metadata lives here. The canonical resolves
// against the root layout's metadataBase, the environment's origin.
export const metadata: Metadata = createPageMetadata({
  title: 'Search Boxers',
  canonical: '/search/'
})

export default function SearchLayout({ children }: { children: React.ReactNode }) {
  return children
}
