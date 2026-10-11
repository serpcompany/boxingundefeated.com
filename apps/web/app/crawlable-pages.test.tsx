// @vitest-environment happy-dom

import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

// The boxer listings, the divisions and the HTML sitemap read D1: listing-pages.test.tsx.
describe('crawlable directory pages', () => {
  it('footer exposes sitemap and canonical division links', async () => {
    const { Footer } = await import('@/components/layout/footer')
    render(<Footer />)

    expect(document.querySelector('a[href="/sitemap/"]')).toBeInTheDocument()
    expect(document.querySelector('a[href="/divisions/"]')).toBeInTheDocument()
    // Retired with a 410 (lib/routing/retired-paths.ts); the DR badge below stays.
    expect(document.querySelector('a[href^="/brands"]')).not.toBeInTheDocument()
    expect(document.querySelector('a[href^="/blog"]')).not.toBeInTheDocument()
    expect(document.querySelector('a[href^="/shop"]')).not.toBeInTheDocument()
    expect(document.querySelector('a[href="/divisions/heavy/"]')).toBeInTheDocument()
    expect(document.querySelector('a[href="/boxers?division=heavy"]')).not.toBeInTheDocument()

    const drBadgeLink = document.querySelector(
      'a[href="https://dr.serp.co/sites/boxingundefeated.com"]'
    )
    const drBadgeImage = drBadgeLink?.querySelector('img')

    expect(drBadgeLink).toHaveAttribute('target', '_blank')
    expect(drBadgeLink).toHaveAttribute('rel', 'noopener noreferrer')
    expect(drBadgeImage).toHaveAttribute(
      'src',
      'https://dr.serp.co/badge/boxingundefeated.com?style=serp-dr-v3'
    )
    expect(drBadgeImage).toHaveAttribute('alt', 'Verified DR 57 for boxingundefeated.com')
    expect(drBadgeImage).toHaveAttribute('width', '200')
    expect(drBadgeImage).toHaveAttribute('height', '50')

    const socialLinks = [
      { label: 'Facebook', href: 'https://www.facebook.com/boxundefeated' },
      { label: 'GitHub', href: 'https://github.com/boxingundefeated' },
      { label: 'Twitter', href: 'https://x.com/boxundefeated' },
      { label: 'Instagram', href: 'https://www.instagram.com/boxundefeated' },
      { label: 'LinkedIn', href: 'https://www.linkedin.com/company/boxingundefeated/' }
    ]

    for (const { label, href } of socialLinks) {
      const socialLink = document.querySelector(`a[aria-label="${label}"]`)

      expect(socialLink).toHaveAttribute('href', href)
      expect(socialLink).toHaveAttribute('target', '_blank')
      expect(socialLink).toHaveAttribute('rel', 'noopener noreferrer')
      expect(socialLink?.querySelector('svg')).toBeInTheDocument()
    }
  })

  it('header exposes the divisions index page', async () => {
    const { Header } = await import('@/components/layout/header')
    render(<Header />)

    expect(document.querySelector('a[href="/divisions/"]')).toBeInTheDocument()
    expect(document.querySelector('a[href^="/shop"]')).not.toBeInTheDocument()
  })
})
