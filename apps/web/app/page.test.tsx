import { render } from '@testing-library/react'
import { getSiteOrigin } from '@/lib/site-config'
import Home, { generateMetadata } from './page'

describe('homepage', () => {
  it('leaves the canonical and og:url to the page, so the metadata API cannot add a slash', () => {
    const metadata = generateMetadata()

    expect(metadata.alternates?.canonical).toBeUndefined()
    expect(metadata.openGraph).not.toHaveProperty('url')
  })

  it('renders the canonical, og:url and JSON-LD url as the origin without a slash', async () => {
    const origin = getSiteOrigin()
    expect(origin).not.toMatch(/\/$/)

    const { container } = render(await Home())
    // React hoists both tags into <head>.
    expect(document.querySelector('link[rel="canonical"]')).toHaveAttribute('href', origin)
    expect(document.querySelector('meta[property="og:url"]')).toHaveAttribute('content', origin)

    const jsonLd = container.ownerDocument.querySelector('script[type="application/ld+json"]')
    expect(JSON.parse(jsonLd?.textContent ?? '{}')).toEqual(
      expect.objectContaining({ '@type': 'WebSite', url: origin })
    )
  })
})
