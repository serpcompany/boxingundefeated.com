import { describe, expect, it } from 'vitest'
import { pageProblems, robotsProblems } from './check-export'

describe('robotsProblems', () => {
  it('accepts the production robots.txt', () => {
    const robots =
      'User-Agent: *\nAllow: /\n\nSitemap: https://boxingundefeated.com/sitemap-index.xml\n'
    expect(robotsProblems(robots)).toEqual([])
  })

  it('rejects the non-production robots.txt', () => {
    expect(robotsProblems('User-agent: *\nDisallow: /\n')).toEqual([
      'no "Allow: /"',
      '"Disallow: /"',
      'no "Sitemap: https://boxingundefeated.com/sitemap-index.xml"'
    ])
  })
})

describe('pageProblems', () => {
  const gtm = '<script>GTM-PP4HWLM</script>'

  it('accepts an indexable production page with GTM', () => {
    const html = `<link rel="canonical" href="https://boxingundefeated.com/boxers/"/>${gtm}`
    expect(pageProblems(html)).toEqual([])
  })

  it('rejects noindex, a missing GTM and a non-production canonical', () => {
    const html =
      '<meta name="robots" content="noindex"/><link rel="canonical" href="http://localhost:8787/"/>'
    expect(pageProblems(html)).toEqual([
      '<meta name="robots" content="noindex">',
      'no Google Tag Manager (GTM-PP4HWLM)',
      'canonical http://localhost:8787/'
    ])
  })

  it('lets a not-found page be noindex, but not skip GTM', () => {
    expect(pageProblems(`<meta name="robots" content="noindex"/>${gtm}`, true)).toEqual([])
    expect(pageProblems('<meta name="robots" content="noindex"/>', true)).toEqual([
      'no Google Tag Manager (GTM-PP4HWLM)'
    ])
  })
})
