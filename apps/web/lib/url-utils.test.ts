import { describe, expect, it } from 'vitest'
import { normalizeInternalPath, toAbsoluteUrl } from './url-utils'

describe('internal path normalization', () => {
  it('normalizes internal paths with trailing slashes except root and files', () => {
    expect(normalizeInternalPath('/')).toBe('/')
    expect(normalizeInternalPath('/divisions')).toBe('/divisions/')
    expect(normalizeInternalPath('/boxers/len-wickwar')).toBe('/boxers/len-wickwar/')
    expect(normalizeInternalPath('/boxers?page=2#list')).toBe('/boxers/?page=2#list')
    expect(normalizeInternalPath('/sitemap-pages.xml/')).toBe('/sitemap-pages.xml')
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
})
