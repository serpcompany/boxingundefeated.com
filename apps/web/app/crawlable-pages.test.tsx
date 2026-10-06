import { render } from '@testing-library/react'
import { getBoxersWithoutBouts } from '@/lib/boxers-loader'
import { getBoxersPageHref } from '@/lib/directory-pagination'
import { getShopPosts } from '@/lib/shop-loader'
import { getSitemapPaths } from '@/lib/sitemap-paths'
import BoxersPage from './boxers/page'
import BrandsPage from './brands/page'
import DivisionPage from './divisions/[division]/page'
import DivisionsPage from './divisions/page'
import ShopPage from './shop/page'
import ShopPaginatedPage from './shop/page/[page]/page'
import HtmlSitemapPage from './sitemap/page'

jest.mock('@/lib/blog-loader', () => ({
  getBlogSlugs: jest.fn(async () => ['/blog/test-post/'])
}))

describe('crawlable directory pages', () => {
  it('/boxers contains boxer detail links and crawlable pagination anchors', async () => {
    const firstBoxer = getBoxersWithoutBouts()[0]
    render(await BoxersPage())

    expect(document.querySelector(`a[href="/boxers/${firstBoxer.slug}/"]`)).toBeInTheDocument()
    expect(document.querySelector('a[href="/boxers/page/2/"]')).toBeInTheDocument()
    expect(document.querySelector('a[href="/boxers/page/117/"]')).toBeInTheDocument()
  })

  it('/divisions/heavy contains crawlable pagination anchors', async () => {
    render(await DivisionPage({ params: Promise.resolve({ division: 'heavy' }) }))

    expect(document.querySelector('a[href="/divisions/heavy/page/2/"]')).toBeInTheDocument()
  })

  it('/divisions lists every division with canonical division links', async () => {
    render(await DivisionsPage())

    expect(document.querySelector('a[href="/divisions/heavy/"]')).toBeInTheDocument()
    expect(document.querySelector('a[href="/divisions/light-fly/"]')).toBeInTheDocument()
  })

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

  it('/brands renders noAdult brands alphabetically with dofollow external links', async () => {
    render(await BrandsPage())

    const names = Array.from(document.querySelectorAll('h2')).map(heading => heading.textContent)

    expect(names).toEqual([...names].sort((a, b) => String(a).localeCompare(String(b))))

    const boxingLink = document.querySelector(
      'a[href="https://boxingundefeated.com"]'
    ) as HTMLAnchorElement

    expect(boxingLink).toBeInTheDocument()
    expect(boxingLink).toHaveTextContent('https://boxingundefeated.com')
    expect(boxingLink).toHaveAttribute('target', '_blank')
    expect(boxingLink.getAttribute('rel')).not.toContain('nofollow')
    expect(
      document.querySelector('a[href="https://mindvalleyvideodownloader.com"]')
    ).toBeInTheDocument()
    expect(
      document.querySelector('a[href="https://onlyfansvideodownloader.com"]')
    ).not.toBeInTheDocument()
    expect(
      document.querySelector('a[href="https://pornhubvideodownloaderapp.com"]')
    ).not.toBeInTheDocument()
  })

  it('/sitemap includes directory and XML sitemap links without every detail page', async () => {
    const firstBoxer = getBoxersWithoutBouts()[0]
    const firstShopPost = (await getShopPosts())[0]
    render(await HtmlSitemapPage())

    expect(document.querySelector('a[href="/sitemap/"]')).toBeInTheDocument()
    expect(document.querySelector(`a[href="${getBoxersPageHref(2)}"]`)).toBeInTheDocument()
    expect(document.querySelector('a[href="/divisions/heavy/page/2/"]')).toBeInTheDocument()
    expect(document.querySelector('a[href="/shop/page/2/"]')).toBeInTheDocument()
    expect(document.querySelector('a[href="/sitemap.xml"]')).toBeInTheDocument()
    expect(document.querySelector('a[href="/sitemap-index.xml"]')).toBeInTheDocument()
    expect(document.querySelector('a[href="/sitemaps/pages/1.xml"]')).toBeInTheDocument()
    expect(document.querySelector('a[href="/sitemaps/blog/1.xml"]')).toBeInTheDocument()
    expect(document.querySelector('a[href="/sitemaps/divisions/1.xml"]')).toBeInTheDocument()
    expect(document.querySelector('a[href="/sitemaps/shop/1.xml"]')).toBeInTheDocument()
    expect(document.querySelector('a[href="/sitemaps/boxers/1.xml"]')).toBeInTheDocument()
    expect(document.querySelector(`a[href="/boxers/${firstBoxer.slug}/"]`)).not.toBeInTheDocument()
    expect(document.querySelector(`a[href="${firstShopPost.slug}"]`)).not.toBeInTheDocument()
  })

  it('getSitemapPaths includes division, shop, shop detail, and brand URLs', async () => {
    const paths = await getSitemapPaths()

    expect(paths.pages).toEqual(expect.arrayContaining(['/', '/brands/', '/sitemap/']))
    expect(paths.pages).not.toContain('/shop/')
    expect(paths.pages).not.toContain('/divisions/')
    expect(paths.divisionListings).toEqual(expect.arrayContaining(['/divisions/']))
    expect(paths.shopListings).toEqual(expect.arrayContaining(['/shop/', '/shop/page/2/']))
    expect(paths.shopPosts).toEqual(expect.arrayContaining(['/shop/best/boxing-resistance-bands/']))
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
