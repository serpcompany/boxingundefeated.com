import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { FILE_EXTENSION_PATTERN, hasFileExtension } from './file-extensions'

describe('hasFileExtension', () => {
  it.each([
    ['robots.txt', true],
    ['sitemap-index.xml', true],
    ['favicon.ico', true],
    ['x.JSON', true],
    ['a.b.webmanifest', true],
    ['2.7-l', false],
    ['16.9-oz', false],
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
