import { getBlogSlugs } from './blog-loader'
import { getShopSlugs } from './shop-loader'
import { getSitemapPaths, normalizeInternalPath, toAbsoluteUrl } from './sitemap-paths'

jest.mock('remark', () => ({
  remark: () => ({
    use: () => ({
      process: async () => ''
    })
  })
}))

jest.mock('remark-html', () => ({
  __esModule: true,
  default: jest.fn()
}))

function flattenSitemapPaths(paths: Awaited<ReturnType<typeof getSitemapPaths>>): string[] {
  return Object.values(paths).flat()
}

describe('sitemap path normalization', () => {
  it('normalizes internal paths with trailing slashes except root', () => {
    expect(normalizeInternalPath('/')).toBe('/')
    expect(normalizeInternalPath('/divisions')).toBe('/divisions/')
    expect(normalizeInternalPath('/shop/best/boxing-resistance-bands')).toBe(
      '/shop/best/boxing-resistance-bands/'
    )
    expect(normalizeInternalPath('/shop?page=2#guides')).toBe('/shop/?page=2#guides')
    expect(normalizeInternalPath('/sitemaps/pages/1.xml')).toBe('/sitemaps/pages/1.xml')
    expect(normalizeInternalPath('brands')).toBe('/brands/')
  })

  it('builds absolute URLs from normalized internal paths', () => {
    expect(toAbsoluteUrl('https://boxingundefeated.com/', '/divisions')).toBe(
      'https://boxingundefeated.com/divisions/'
    )
    expect(toAbsoluteUrl('https://boxingundefeated.com', '/')).toBe('https://boxingundefeated.com')
    expect(toAbsoluteUrl('https://boxingundefeated.com', '/sitemap-index.xml')).toBe(
      'https://boxingundefeated.com/sitemap-index.xml'
    )
  })

  it('emits no duplicate page URLs and forces trailing slash URLs except root', async () => {
    const paths = await getSitemapPaths()
    const allPaths = flattenSitemapPaths(paths)

    expect(allPaths.filter(pathname => pathname !== '/' && !pathname.endsWith('/'))).toEqual([])
    expect(allPaths).toHaveLength(new Set(allPaths).size)
  })

  it('keeps shop posts out of the blog/main sitemap owner set', async () => {
    const blogSlugs = await getBlogSlugs()
    const shopSlugs = await getShopSlugs()
    const paths = await getSitemapPaths()

    expect(blogSlugs.filter(slug => slug.startsWith('/shop/'))).toEqual([])
    expect(paths.blogPosts.filter(slug => slug.startsWith('/shop/'))).toEqual([])
    expect(paths.shopPosts).toContain('/shop/best/boxing-resistance-bands/')
    expect(paths.pages).not.toContain('/shop/best/boxing-resistance-bands/')
    expect(blogSlugs.filter(slug => shopSlugs.includes(slug))).toEqual([])
  })
})
