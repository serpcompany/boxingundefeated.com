import {
  createBoxerMetaDescription,
  createDocumentMetadata,
  createMetaDescription,
  createNotFoundMetadata,
  createPageMetadata,
  createRootMetadata,
  MAX_META_DESCRIPTION_LENGTH,
  MAX_TITLE_LENGTH,
  pageTitle
} from './metadata'
import { getShopPosts } from './shop-loader'
import { getSiteOrigin } from './site-config'

describe('metadata helpers', () => {
  it('defines default Open Graph and Twitter metadata at the root', () => {
    const metadata = createRootMetadata()
    const description = metadata.description

    // Every page replaces it with its own (app/page-titles.test.tsx).
    expect(metadata.title).toBe('Boxing Undefeated')
    expect(description).toEqual(expect.any(String))
    expect(metadata.metadataBase).toEqual(new URL(getSiteOrigin()))
    expect(metadata.openGraph).toEqual(
      expect.objectContaining({
        title: metadata.title,
        description,
        siteName: 'Boxing Undefeated',
        type: 'website'
      })
    )
    // Inherited by every page, so the root sets neither: the homepage renders its own.
    expect(metadata.alternates?.canonical).toBeUndefined()
    expect(metadata.openGraph).not.toHaveProperty('url')
    expect(metadata.openGraph?.images).toEqual([
      expect.objectContaining({
        url: '/opengraph-image.png',
        alt: 'Boxing Undefeated'
      })
    ])
    expect(metadata.twitter).toEqual(
      expect.objectContaining({
        card: 'summary_large_image',
        title: metadata.title,
        description
      })
    )
    expect(metadata.twitter?.images).toEqual(['/opengraph-image.png'])
  })

  it('titles a page `<page title> - Boxing Undefeated`', () => {
    expect(pageTitle('Boxers Directory - Page 2')).toBe(
      'Boxers Directory - Page 2 - Boxing Undefeated'
    )
  })

  it('keeps the site name on a title of any length unless the page lets it go', () => {
    const long = 'Carlos Antonio Rodriguez Moreno Record, Stats & Fights'

    expect(pageTitle(long)).toBe(`${long} - Boxing Undefeated`)
    expect(pageTitle(long, { siteNameIfFits: false })).toBe(`${long} - Boxing Undefeated`)
  })

  it('with siteNameIfFits, keeps the site name on a title of exactly 60 characters', () => {
    const title = pageTitle('Jonathan Gonzalez Record, Stats & Fights', { siteNameIfFits: true })

    expect(MAX_TITLE_LENGTH).toBe(60)
    expect(title).toBe('Jonathan Gonzalez Record, Stats & Fights - Boxing Undefeated')
    expect(title).toHaveLength(MAX_TITLE_LENGTH)
    expect(pageTitle('Ana Alpha Record, Stats & Fights', { siteNameIfFits: true })).toBe(
      'Ana Alpha Record, Stats & Fights - Boxing Undefeated'
    )
  })

  it('with siteNameIfFits, drops the site name past 60 characters and never cuts the title', () => {
    // 61 characters with the site name.
    expect('Demetrius Williams Record, Stats & Fights - Boxing Undefeated').toHaveLength(61)
    expect(pageTitle('Demetrius Williams Record, Stats & Fights', { siteNameIfFits: true })).toBe(
      'Demetrius Williams Record, Stats & Fights'
    )

    const long = 'Carlos Antonio Rodriguez Moreno Record, Stats & Fights'
    expect(pageTitle(long, { siteNameIfFits: true })).toBe(long)
  })

  it('gives the dropped-site-name title to og:title and twitter:title as well', () => {
    const title = "Hassan N'Dam N'Jikam Record, Stats & Fights"
    const metadata = createPageMetadata({ title, siteNameIfFits: true })

    expect(metadata.title).toBe(title)
    expect(metadata.openGraph?.title).toBe(title)
    expect(metadata.twitter?.title).toBe(title)
    expect(metadata).not.toHaveProperty('siteNameIfFits')
  })

  it("gives a page's og:title and twitter:title its title, and its og:url its canonical", () => {
    const canonical = 'https://boxingundefeated.com/divisions/heavy/page/2/'
    const metadata = createPageMetadata({
      title: 'Heavyweight Boxers - Page 2',
      description: 'Browse page 2 of   professional heavyweight boxers.',
      canonical
    })
    const title = 'Heavyweight Boxers - Page 2 - Boxing Undefeated'
    const description = 'Browse page 2 of professional heavyweight boxers.'
    const root = createRootMetadata()

    expect(metadata).toEqual({
      title,
      description,
      alternates: { canonical },
      openGraph: { ...root.openGraph, title, description, url: canonical },
      twitter: { ...root.twitter, title, description }
    })
  })

  it("leaves out a canonical and og:url the page doesn't have, and keeps the site's description", () => {
    const metadata = createPageMetadata({ title: 'Search Boxers' })

    expect(metadata.title).toBe('Search Boxers - Boxing Undefeated')
    expect(metadata.description).toBe(createRootMetadata().description)
    expect(metadata.openGraph?.description).toBe(metadata.description)
    expect(metadata).not.toHaveProperty('alternates')
    expect(metadata.openGraph).not.toHaveProperty('url')
  })

  it('uses a document title as given: the homepage keeps its own', () => {
    const metadata = createDocumentMetadata({ title: 'Boxing Undefeated - Professional Boxers' })

    expect(metadata.title).toBe('Boxing Undefeated - Professional Boxers')
    expect(metadata.openGraph?.title).toBe(metadata.title)
    expect(metadata.twitter?.title).toBe(metadata.title)
  })

  it('titles every 404 Page Not Found, without a canonical', () => {
    const metadata = createNotFoundMetadata()

    expect(metadata.title).toBe('Page Not Found - Boxing Undefeated')
    expect(metadata.openGraph?.title).toBe(metadata.title)
    expect(metadata.twitter?.title).toBe(metadata.title)
    expect(metadata).not.toHaveProperty('alternates')
  })

  it('creates non-empty capped boxer meta descriptions from boxer data', () => {
    const boxer = { name: 'Jesse Hart', bio: `<p>${'A long boxing career. '.repeat(20)}</p>` }

    const description = createBoxerMetaDescription(boxer)

    expect(
      description.startsWith('Professional boxing record and statistics for Jesse Hart.')
    ).toBe(true)
    expect(description.length).toBeLessThanOrEqual(MAX_META_DESCRIPTION_LENGTH)
    expect(description.endsWith('...')).toBe(true)
  })

  it('creates non-empty capped shop post meta descriptions from post excerpts', async () => {
    const posts = await getShopPosts()
    const post = posts.find(item => item.slug === '/shop/best/boxing-resistance-bands/')

    expect(post).toBeDefined()

    const description = createMetaDescription(post?.description)

    expect(description).toEqual(expect.any(String))
    expect(description.length).toBeGreaterThan(0)
    expect(description.length).toBeLessThanOrEqual(MAX_META_DESCRIPTION_LENGTH)
  })
})
