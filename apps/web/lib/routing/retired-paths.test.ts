/**
 * @jest-environment node
 */
import { isRetiredPath, RETIRED_SECTIONS, retiredPathResponse } from './retired-paths'
import { canonicalPathname } from './trailing-slash'

// Every /blog/ path family the Wayback Machine has for the old site (posts, author, category and
// tag archives with pagination, and a 301), and the /brands/ page.
const retired = [
  '/blog',
  '/blog/',
  '/blog/jab/',
  '/blog/x/',
  '/blog/author/alex/page/2/',
  '/blog/category/punches/',
  '/blog/tag/boxing/page/3/',
  '/blog/src',
  '/blog/feed.xml',
  '/brands',
  '/brands/',
  '/brands/x/'
]
const notRetired = [
  '/',
  '/blogs/',
  '/blog-post/',
  '/brand/',
  '/brandsx/',
  '/Blog/',
  '/BRANDS/',
  '/shop/best/blog/',
  '/about/'
]

describe('isRetiredPath', () => {
  it.each(retired)('%s is retired', path => {
    expect(isRetiredPath(path)).toBe(true)
  })

  it.each(notRetired)('%s is not', path => {
    expect(isRetiredPath(path)).toBe(false)
  })

  it('lists each section once, without a trailing slash, with a reason', () => {
    const paths = RETIRED_SECTIONS.map(section => section.path)
    expect(paths).toEqual(['/blog', '/brands'])
    for (const { path, reason } of RETIRED_SECTIONS) {
      expect(path).toMatch(/^\/[^/]+(?:\/[^/]+)*$/)
      expect(reason.length).toBeGreaterThan(0)
    }
  })

  it('retires every slash form of a section, so the 410 never needs a redirect first', () => {
    for (const { path } of RETIRED_SECTIONS) {
      expect(isRetiredPath(canonicalPathname(path))).toBe(true)
    }
  })
})

describe('retiredPathResponse', () => {
  it('answers 410 with a small noindex page that links home, never cached', async () => {
    const response = retiredPathResponse(new Request('https://boxingundefeated.com/blog/'))

    expect(response?.status).toBe(410)
    expect(response?.headers.get('content-type')).toBe('text/html; charset=utf-8')
    expect(response?.headers.get('cache-control')).toBe('no-store')
    expect(response?.headers.get('x-robots-tag')).toBe('noindex')
    const html = (await response?.text()) ?? ''
    expect(html).toMatch(/^<!doctype html>/)
    expect(html).toContain('<meta name="robots" content="noindex">')
    expect(html).toContain('<title>Page Gone - Boxing Undefeated</title>')
    expect(html).toContain('<h1>Page Gone</h1>')
    expect(html).toContain('<a href="/">Back to homepage</a>')
    expect(new TextEncoder().encode(html).length).toBeLessThan(1024)
  })

  it('answers every method, HEAD without a body', async () => {
    for (const method of ['GET', 'HEAD', 'POST']) {
      const response = retiredPathResponse(
        new Request('https://boxingundefeated.com/brands', { method })
      )
      expect(response?.status).toBe(410)
      expect(await response?.text()).toEqual(
        method === 'HEAD' ? '' : expect.stringContaining('Page Gone')
      )
    }
  })

  it('keeps the query string out of the match', () => {
    expect(
      retiredPathResponse(new Request('https://boxingundefeated.com/blog/?p=12'))?.status
    ).toBe(410)
    expect(retiredPathResponse(new Request('https://boxingundefeated.com/about/?ref=blog'))).toBe(
      null
    )
  })

  it.each(notRetired)('leaves %s alone', path => {
    expect(retiredPathResponse(new Request(`https://boxingundefeated.com${path}`))).toBeNull()
  })
})
