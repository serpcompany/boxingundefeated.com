import { getBaseUrl } from '@boxingundefeated/utils/get-base-url'
import { getBoxersWithoutBouts } from './boxers-loader'
import {
  createBoxerMetaDescription,
  createMetaDescription,
  createRootMetadata,
  MAX_META_DESCRIPTION_LENGTH
} from './metadata'
import { getShopPosts } from './shop-loader'

describe('metadata helpers', () => {
  it('defines default Open Graph and Twitter metadata at the root', () => {
    const metadata = createRootMetadata()
    const description = metadata.description

    expect(description).toEqual(expect.any(String))
    expect(metadata.metadataBase).toEqual(new URL(getBaseUrl()))
    expect(metadata.openGraph).toEqual(
      expect.objectContaining({
        title: metadata.title,
        description,
        siteName: 'Boxing Undefeated',
        type: 'website',
        url: getBaseUrl()
      })
    )
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
    const boxer = getBoxersWithoutBouts().find(item => item.bio && item.bio.length > 160)

    expect(boxer).toBeDefined()

    const description = createBoxerMetaDescription(boxer!)

    expect(description).toEqual(expect.any(String))
    expect(description.length).toBeGreaterThan(0)
    expect(description.length).toBeLessThanOrEqual(MAX_META_DESCRIPTION_LENGTH)
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
