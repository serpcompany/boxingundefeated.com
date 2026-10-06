import { hasFileExtension } from '../routing/file-extensions'
import { getShopPosts, SHOP_PAGE_SIZE } from '../shop-loader'
import { isServedShopPath, shopSitemapEntries } from './content'

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

  it('leaves out articles the Worker does not serve, but counts them on the listing', () => {
    const { shop } = shopSitemapEntries(
      [
        { slug: '/shop/best/nestlé-water-bottles/', date: '2024-01-15' },
        { slug: '/shop/best/a/', date: '2024-01-15' }
      ],
      1
    )
    expect(shop.map(entry => entry.path)).toEqual(['/shop/', '/shop/page/2/', '/shop/best/a/'])
  })

  it.each([
    ['/shop/best/2.7-l-water-bottles/', true],
    ["/shop/best/men's-water-bottles/", true],
    ['/shop/best/brümate-water-bottles/', false],
    ['/shop/best/nestlé-water-bottles/', false]
  ])('%s is served: %s', (path, served) => {
    expect(isServedShopPath(path)).toBe(served)
  })

  it('lists every shop page and served article in content/, each once, as a canonical page', async () => {
    const posts = await getShopPosts()
    const paths = shopSitemapEntries(posts).shop.map(entry => entry.path)
    const pages = Math.ceil(posts.length / SHOP_PAGE_SIZE)

    expect(posts.length).toBeGreaterThan(600)
    expect(new Set(paths).size).toBe(paths.length)
    expect(paths).toHaveLength(pages + posts.length - 2)
    expect(paths.slice(0, pages)).toEqual([
      '/shop/',
      ...Array.from({ length: pages - 1 }, (_, index) => `/shop/page/${index + 2}/`)
    ])
    expect(paths.filter(path => !/^\/shop\/(?:[^?#]+\/)?$/.test(path))).toEqual([])
    expect(paths.filter(path => hasFileExtension(path.slice(0, -1)))).toEqual([])
    expect(paths).toEqual(
      expect.arrayContaining([
        '/shop/best/2.7-l-water-bottles/',
        '/shop/best/16.9-oz-water-bottles/'
      ])
    )
    expect(paths.filter(path => !isServedShopPath(path))).toEqual([])
  })
})
