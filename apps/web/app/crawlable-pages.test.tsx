import { render } from '@testing-library/react'
import { getBoxersWithoutBouts } from '@/lib/boxers-loader'
import { getBoxersPageHref } from '@/lib/directory-pagination'
import BoxersPage from './boxers/page'
import DivisionPage from './divisions/[division]/page'
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

  it('/sitemap includes boxer detail and paginated listing links', async () => {
    const firstBoxer = getBoxersWithoutBouts()[0]
    render(await HtmlSitemapPage())

    expect(document.querySelector('a[href="/sitemap/"]')).toBeInTheDocument()
    expect(document.querySelector(`a[href="/boxers/${firstBoxer.slug}"]`)).toBeInTheDocument()
    expect(document.querySelector(`a[href="${getBoxersPageHref(2)}"]`)).toBeInTheDocument()
    expect(document.querySelector('a[href="/divisions/heavy/page/2"]')).toBeInTheDocument()
  })

  it('footer exposes sitemap and canonical division links', async () => {
    const { Footer } = await import('@/components/layout/footer')
    render(<Footer />)

    expect(document.querySelector('a[href="/sitemap/"]')).toBeInTheDocument()
    expect(document.querySelector('a[href="/divisions/heavy"]')).toBeInTheDocument()
    expect(document.querySelector('a[href="/boxers?division=heavy"]')).not.toBeInTheDocument()
  })
})
