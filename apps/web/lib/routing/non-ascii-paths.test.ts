/**
 * @jest-environment node
 */
import { getShopPosts } from '../shop-loader'
import { canonicalShopPathname, decodePagePath, encodePath, routeKeyPath } from './non-ascii-paths'

const BRUMATE = '/shop/best/brümate-water-bottles/'
const BRUMATE_URL = '/shop/best/br%C3%BCmate-water-bottles/'
const BRUMATE_KEY = '/shop/best/br~C3~BCmate-water-bottles/'
// The same path decomposed (NFD): u and a combining diaeresis.
const BRUMATE_NFD = '/shop/best/brümate-water-bottles/'

describe('encodePath', () => {
  it('percent-encodes non-ASCII letters as UTF-8 in uppercase hex, in NFC', () => {
    expect(encodePath(BRUMATE)).toBe(BRUMATE_URL)
    expect(encodePath(BRUMATE_NFD)).toBe(BRUMATE_URL)
    expect(encodePath('/shop/best/nestlé-water-bottles/')).toBe(
      '/shop/best/nestl%C3%A9-water-bottles/'
    )
  })

  it('keeps ASCII as it is, so an encoded path comes back unchanged', () => {
    expect(encodePath("/shop/best/men's-water-bottles/")).toBe("/shop/best/men's-water-bottles/")
    expect(encodePath('/shop/best/x%20y/')).toBe('/shop/best/x%20y/')
    expect(encodePath(BRUMATE_URL)).toBe(BRUMATE_URL)
  })
})

describe('route keys', () => {
  it('spell a path with non-ASCII letters in ASCII, with ~ for %', () => {
    expect(routeKeyPath(BRUMATE)).toBe(BRUMATE_KEY)
    expect(routeKeyPath(BRUMATE_NFD)).toBe(BRUMATE_KEY)
    expect(routeKeyPath(BRUMATE_URL)).toBe(BRUMATE_KEY)
  })

  it('leave an ASCII path as it is', () => {
    expect(routeKeyPath('/shop/best/2.7-l-water-bottles/')).toBe('/shop/best/2.7-l-water-bottles/')
    expect(routeKeyPath("/shop/best/men's-water-bottles/")).toBe("/shop/best/men's-water-bottles/")
  })

  it('decode back to the page path, as every other spelling does', () => {
    for (const path of [
      BRUMATE_KEY,
      '/shop/best/br~c3~bcmate-water-bottles/',
      BRUMATE_URL,
      '/shop/best/br%c3%bcmate-water-bottles/',
      '/shop/best/bru%CC%88mate-water-bottles/',
      BRUMATE_NFD,
      BRUMATE
    ]) {
      expect(decodePagePath(path)).toBe(BRUMATE)
    }
  })

  it('leave ASCII and malformed paths to decode as they are', () => {
    for (const path of ['/shop/best/x%20y/', '/shop/best/br%C3mate/', '/shop/best/x~80/', '/']) {
      expect(decodePagePath(path)).toBe(path)
    }
  })
})

describe('canonicalShopPathname', () => {
  it.each<[string, string]>([
    [BRUMATE_URL, 'canonical'],
    ['/shop/best/br%C3%BCmate-water-bottles', 'no slash'],
    ['/shop/best/br%c3%bcmate-water-bottles/', 'lowercase hex, as workerd passes raw UTF-8 on'],
    ['/shop/best/br%c3%bcmate-water-bottles', 'lowercase hex, no slash'],
    ['/shop/best/bru%CC%88mate-water-bottles/', 'NFD'],
    ['/shop/best/bru%CC%88mate-water-bottles', 'NFD, no slash'],
    [BRUMATE_KEY, 'route key'],
    ['/shop/best/br~c3~bcmate-water-bottles', 'route key, lowercase, no slash'],
    [BRUMATE, 'raw UTF-8']
  ])('spells %s (%s) as the percent-encoded NFC page', pathname => {
    expect(canonicalShopPathname(pathname)).toBe(BRUMATE_URL)
  })

  it.each<[string, string]>([
    ['/shop//best/br%C3%BCmate-water-bottles/', BRUMATE_URL],
    ['/shop//best/br%C3%BCmate-water-bottles', BRUMATE_URL],
    ['//shop/best/bru%CC%88mate-water-bottles/', BRUMATE_URL],
    ['/shop/best//br~C3~BCmate-water-bottles//', BRUMATE_URL],
    ['/shop/best//nestl%C3%A9-water-bottles/', '/shop/best/nestl%C3%A9-water-bottles/'],
    ['/shop/best//nestl%C3%A9-water-bottles', '/shop/best/nestl%C3%A9-water-bottles/'],
    ['/shop///best/nestle%CC%81-water-bottles', '/shop/best/nestl%C3%A9-water-bottles/']
  ])('collapses the repeated slashes of %s in the same hop, to %s', (pathname, canonical) => {
    expect(canonicalShopPathname(pathname)).toBe(canonical)
  })

  it.each<[string, string]>([
    ['/shop/best/2.7-l-water-bottles/', 'ASCII'],
    ['/shop//best/2.7-l-water-bottles/', 'ASCII, repeated slashes: OpenNext collapses them'],
    ["/shop/best/men's-water-bottles", 'ASCII, no slash: the slash rules redirect it'],
    ['/shop/best/x%20y/', 'an ASCII escape'],
    ['/shop/best/x~41/', 'not a route key: ~ before an ASCII byte'],
    ['/shop/best/br%C3mate/', 'malformed UTF-8'],
    ['/shop/best/x~80/', 'malformed UTF-8 in a route key'],
    ['/boxers/jos%C3%A9/', 'not a shop path'],
    ['/api/x%C3%A9', 'not a shop path']
  ])('leaves %s (%s) alone', pathname => {
    expect(canonicalShopPathname(pathname)).toBeNull()
  })
})

describe('the shop articles in content/', () => {
  it('each have one canonical URL, and a route key that leads back to them', async () => {
    const posts = await getShopPosts()
    const nonAscii = posts
      .map(post => post.slug)
      .filter(slug => /[^\x21-\x7e]/.test(slug))
      .sort()

    expect(nonAscii).toEqual([
      '/shop/best/brümate-water-bottles/',
      '/shop/best/nestlé-water-bottles/'
    ])
    for (const post of posts) {
      // Route keys would be ambiguous for a slug with its own `~` or `%`.
      expect(post.slug).not.toMatch(/[~%]/)
      expect(post.slug).toBe(post.slug.normalize('NFC'))
      expect(decodePagePath(routeKeyPath(post.slug))).toBe(post.slug)
      const url = encodePath(post.slug)
      expect(canonicalShopPathname(url)).toBe(nonAscii.includes(post.slug) ? url : null)
    }
  })
})
