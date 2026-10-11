import { render } from '@testing-library/react'
import brandsData from '@/lib/brands-data.json'
import { getShopPosts } from '@/lib/shop-loader'
import BrandsPage from './brands/page'
import ShopPage from './shop/page'
import ShopPaginatedPage from './shop/page/[page]/page'

// The boxer listings, the divisions and the HTML sitemap read D1: listing-pages.test.tsx.
describe('crawlable directory pages', () => {
  it('/shop renders shop detail links and crawlable pagination anchors', async () => {
    const firstPost = (await getShopPosts())[0]
    render(await ShopPage())

    expect(document.querySelector(`a[href="${firstPost.slug}"]`)).toBeInTheDocument()
    expect(document.querySelector('a[href="/shop/page/2/"]')).toBeInTheDocument()
  })

  it('/shop/page/2 renders the second shop page with canonical pagination links', async () => {
    render(await ShopPaginatedPage({ params: Promise.resolve({ page: '2' }) }))

    expect(document.querySelector('a[href="/shop/"]')).toBeInTheDocument()
    expect(document.querySelector('a[href="/shop/page/3/"]')).toBeInTheDocument()
  })

  it('/brands lists each brand once, alphabetically, linked by name in a new tab', async () => {
    const { container } = render(await BrandsPage())
    const links = Array.from(container.querySelectorAll<HTMLAnchorElement>('ul a'))
    const names = links.map(link => link.textContent)

    expect(links.map(link => [link.textContent, link.getAttribute('href')])).toEqual(
      [...brandsData.brands]
        .sort((a, b) => a.name.localeCompare(b.name, 'en'))
        .map(brand => [brand.name, brand.url])
    )
    expect(names).toHaveLength(brandsData.brands.length)
    expect(new Set(names).size).toBe(names.length)
    expect(names.at(0)).toBe('Awesome Shadcn UI')
    expect(names.at(-1)).toBe('yt-dlp online')

    for (const link of links) {
      expect(link).toHaveAttribute('target', '_blank')
      expect(link).toHaveAttribute('rel', 'noopener')
    }

    // The root layout renders the page's <main>.
    expect(container.querySelector('main')).not.toBeInTheDocument()
  })

  it('footer exposes sitemap and canonical division links', async () => {
    const { Footer } = await import('@/components/layout/footer')
    render(<Footer />)

    expect(document.querySelector('a[href="/sitemap/"]')).toBeInTheDocument()
    expect(document.querySelector('a[href="/divisions/"]')).toBeInTheDocument()
    expect(document.querySelector('a[href="/shop/"]')).toBeInTheDocument()
    expect(document.querySelector('a[href="/brands/"]')).toBeInTheDocument()
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
      { label: 'Reddit', href: '#' },
      { label: 'Twitter', href: 'https://x.com/boxundefeated' },
      { label: 'Instagram', href: 'https://www.instagram.com/boxundefeated' },
      { label: 'YouTube', href: '#' },
      { label: 'Threads', href: '#' },
      { label: 'TikTok', href: '#' },
      {
        label: 'LinkedIn',
        href: 'https://www.linkedin.com/company/90466967/admin/dashboard/'
      }
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
  })
})
