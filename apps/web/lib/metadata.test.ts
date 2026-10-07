import {
  createBoxerMetaDescription,
  createMetaDescription,
  createRootMetadata,
  MAX_META_DESCRIPTION_LENGTH
} from './metadata'
import { getShopPosts } from './shop-loader'
import { getSiteOrigin } from './site-config'

describe('metadata helpers', () => {
  it('defines default Open Graph and Twitter metadata at the root', () => {
    const metadata = createRootMetadata()
    const description = metadata.description

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
