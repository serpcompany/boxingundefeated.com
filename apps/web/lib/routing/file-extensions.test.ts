/**
 * @jest-environment node
 */
import fs from 'node:fs'
import path from 'node:path'
import { getBlogSlugs } from '../blog-loader'
import { getShopSlugs } from '../shop-loader'
import { FILE_EXTENSION_PATTERN, hasFileExtension } from './file-extensions'

describe('hasFileExtension', () => {
  it.each([
    ['robots.txt', true],
    ['sitemap-index.xml', true],
    ['favicon.ico', true],
    ['x.JSON', true],
    ['a.b.webmanifest', true],
    ['2.7-l-water-bottles', false],
    ['16.9-oz-water-bottles', false],
    ['aws.amazon.com', false],
    ['a.json5', false],
    ['foo.', false],
    ['about', false]
  ])('%s -> %s', (name, expected) => {
    expect(hasFileExtension(name)).toBe(expected)
  })

  it('agrees with the case-insensitive pattern the redirects use', () => {
    const pattern = new RegExp(`^[^/]+\\.${FILE_EXTENSION_PATTERN}$`)
    for (const name of ['robots.txt', 'ROBOTS.TXT', 'x.Json', '2.7-l', 'a.json5', 'a.webm']) {
      expect([name, pattern.test(name)]).toEqual([name, hasFileExtension(name)])
    }
  })
})

describe('page slugs', () => {
  // Boxer slugs are `[a-z0-9-]` (the importer's SLUG_PATTERN), and division slugs are fixed.
  // Shop and blog slugs come from markdown front matter, so check them: a page whose last
  // segment ended in a file extension would lose its slash.
  it('never end in a file extension', async () => {
    const slugs = [...(await getShopSlugs()), ...(await getBlogSlugs())]
    expect(slugs.length).toBeGreaterThan(600)
    const segments = slugs.map(slug => slug.replace(/\/+$/, '').split('/').pop() ?? '')
    expect(segments.filter(hasFileExtension)).toEqual([])
    // The dotted ones today, which must keep their slash.
    expect(segments.filter(segment => segment.includes('.')).sort()).toEqual([
      '16.9-oz-water-bottles',
      '2.7-l-water-bottles'
    ])
  })
})

describe('public files', () => {
  // The Worker serves `public/` at the same paths. A file whose extension isn't listed counts as
  // a page, so the slash redirect would send it to a slashed URL that 404s.
  it('all end in a listed file extension', () => {
    const root = path.join(__dirname, '..', '..', 'public')
    const files = (fs.readdirSync(root, { recursive: true, withFileTypes: true }) as fs.Dirent[])
      .filter(entry => entry.isFile())
      .map(entry => path.relative(root, path.join(entry.parentPath, entry.name)))
    expect(files.length).toBeGreaterThan(0)
    expect(files.filter(file => !hasFileExtension(path.basename(file)))).toEqual([])
  })
})
