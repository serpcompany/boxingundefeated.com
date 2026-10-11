import { hasFileExtension } from '../routing/file-extensions'
import { getShopPosts, SHOP_PAGE_SIZE } from '../shop-loader'
import { shopSitemapEntries } from './content'

describe('shop sitemap entries', () => {
  it('lists the shop pages, then each article dated by its publishDate', () => {
    const { shop } = shopSitemapEntries(
      [
        { slug: '/shop/best/a/', date: '2024-01-15T05:17:03Z' },
        { slug: '/shop/best/b/', date: '2024-03-01T00:00:00Z' },
        { slug: '/shop/best/c/', date: 'not a date' }
      ],
      2
    )
    expect(shop).toEqual([
      { path: '/shop/', lastmod: '2024-03-01' },
      { path: '/shop/page/2/', lastmod: '2024-03-01' },
      { path: '/shop/best/a/', lastmod: '2024-01-15' },
      { path: '/shop/best/b/', lastmod: '2024-03-01' },
      { path: '/shop/best/c/' }
    ])
  })

  it('lists a path with non-ASCII letters percent-encoded, in NFC', () => {
    const { shop } = shopSitemapEntries(
      [
        { slug: '/shop/best/nestlé-water-bottles/', date: '2024-01-15' },
        // The same letter decomposed (NFD): e and a combining acute accent.
        { slug: '/shop/best/brume\u0301-x/', date: '2024-01-15' },
        { slug: "/shop/best/men's-water-bottles/", date: '2024-01-15' }
      ],
      3
    )
    expect(shop.map(entry => entry.path)).toEqual([
      '/shop/',
      '/shop/best/nestl%C3%A9-water-bottles/',
      '/shop/best/brum%C3%A9-x/',
      "/shop/best/men's-water-bottles/"
    ])
  })

  it('lists every shop page and article in content/, each once, as a canonical page', async () => {
    const posts = await getShopPosts()
    const paths = shopSitemapEntries(posts).shop.map(entry => entry.path)
    const pages = Math.ceil(posts.length / SHOP_PAGE_SIZE)

    expect(posts.length).toBeGreaterThan(600)
    expect(new Set(paths).size).toBe(paths.length)
    expect(paths).toHaveLength(pages + posts.length)
    expect(paths.slice(0, pages)).toEqual([
      '/shop/',
      ...Array.from({ length: pages - 1 }, (_, index) => `/shop/page/${index + 2}/`)
    ])
    expect(paths.filter(path => !/^\/shop\/(?:[^?#]+\/)?$/.test(path))).toEqual([])
    expect(paths.filter(path => hasFileExtension(path.slice(0, -1)))).toEqual([])
    expect(paths).toEqual(
      expect.arrayContaining([
        '/shop/best/2.7-l-water-bottles/',
        '/shop/best/16.9-oz-water-bottles/',
        '/shop/best/br%C3%BCmate-water-bottles/',
        '/shop/best/nestl%C3%A9-water-bottles/'
      ])
    )
    // Every <loc> is a URL as sent: printable ASCII only.
    expect(paths.filter(path => !/^\/shop\/[\x21-\x7e]*$/.test(path))).toEqual([])
  })
})
