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

    expect(document.querySelector(`a[href="/boxers/${firstBoxer.slug}"]`)).toBeInTheDocument()
    expect(document.querySelector('a[href="/boxers/page/2"]')).toBeInTheDocument()
    expect(document.querySelector('a[href="/boxers/page/117"]')).toBeInTheDocument()
  })

  it('/divisions/heavy contains crawlable pagination anchors', async () => {
    render(await DivisionPage({ params: { division: 'heavy' } }))

    expect(document.querySelector('a[href="/divisions/heavy/page/2"]')).toBeInTheDocument()
  })

  it('/divisions lists every division with canonical division links', async () => {
    render(await DivisionsPage())

    expect(document.querySelector('a[href="/divisions/heavy"]')).toBeInTheDocument()
    expect(document.querySelector('a[href="/divisions/light-fly"]')).toBeInTheDocument()
  })

  it('/shop renders shop detail links and crawlable pagination anchors', async () => {
    const firstPost = (await getShopPosts())[0]
    render(await ShopPage())

    expect(document.querySelector(`a[href="${firstPost.slug}"]`)).toBeInTheDocument()
    expect(document.querySelector('a[href="/shop/page/2"]')).toBeInTheDocument()
  })

  it('/shop/page/2 renders the second shop page with canonical pagination links', async () => {
    render(await ShopPaginatedPage({ params: { page: '2' } }))

    expect(document.querySelector('a[href="/shop"]')).toBeInTheDocument()
    expect(document.querySelector('a[href="/shop/page/3"]')).toBeInTheDocument()
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

  it('/sitemap includes boxer detail and paginated listing links', async () => {
    const firstBoxer = getBoxersWithoutBouts()[0]
    render(await HtmlSitemapPage())

    expect(document.querySelector('a[href="/sitemap/"]')).toBeInTheDocument()
    expect(document.querySelector(`a[href="/boxers/${firstBoxer.slug}"]`)).toBeInTheDocument()
    expect(document.querySelector(`a[href="${getBoxersPageHref(2)}"]`)).toBeInTheDocument()
    expect(document.querySelector('a[href="/divisions/heavy/page/2"]')).toBeInTheDocument()
  })

  it('getSitemapPaths includes division, shop, shop detail, and brand URLs', async () => {
    const paths = await getSitemapPaths()

    expect(paths.main).toEqual(expect.arrayContaining(['/divisions/', '/brands/']))
    expect(paths.shopListings).toEqual(expect.arrayContaining(['/shop', '/shop/page/2']))
    expect(paths.shopPosts).toEqual(expect.arrayContaining(['/shop/best/boxing-resistance-bands/']))
  })

  it('footer exposes sitemap and canonical division links', async () => {
    const { Footer } = await import('@/components/layout/footer')
    render(<Footer />)

    expect(document.querySelector('a[href="/sitemap/"]')).toBeInTheDocument()
    expect(document.querySelector('a[href="/divisions/"]')).toBeInTheDocument()
    expect(document.querySelector('a[href="/shop/"]')).toBeInTheDocument()
    expect(document.querySelector('a[href="/brands/"]')).toBeInTheDocument()
    expect(document.querySelector('a[href="/divisions/heavy"]')).toBeInTheDocument()
    expect(document.querySelector('a[href="/boxers?division=heavy"]')).not.toBeInTheDocument()
  })

  it('header exposes the divisions index page', async () => {
    const { Header } = await import('@/components/layout/header')
    render(<Header />)

    expect(document.querySelector('a[href="/divisions/"]')).toBeInTheDocument()
  })
})
