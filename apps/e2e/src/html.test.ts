import { describe, expect, it } from 'vitest'
import { isNoindex, pageFacts, robotsGroups } from './html'

const page = `<!DOCTYPE html><html><head><meta charSet="utf-8"/>
<title>Men&#x27;s Water Bottles - Boxing Directory</title>
<meta name="robots" content="noindex"/>
<link rel="canonical" href="https://boxingundefeated.com/shop/best/men&#x27;s-water-bottles/"/>
<meta property="og:url" content="https://boxingundefeated.com"/>
<meta property="og:title" content="Men&#x27;s Water Bottles - Boxing Directory"/>
<meta name="twitter:title" content="Men&#x27;s Water Bottles"/></head>
<body><svg><title>Facebook</title></svg><h1 class="x">Men&#x27;s <span>Water</span>
  Bottles</h1><h1>Second</h1></body></html>`

describe('pageFacts', () => {
  it('reads the document title, canonical, og:url, og:title, twitter:title, first H1 and robots meta', () => {
    expect(pageFacts(page)).toEqual({
      title: "Men's Water Bottles - Boxing Directory",
      canonical: "https://boxingundefeated.com/shop/best/men's-water-bottles/",
      canonicalCount: 1,
      ogUrl: 'https://boxingundefeated.com',
      ogTitle: "Men's Water Bottles - Boxing Directory",
      twitterTitle: "Men's Water Bottles",
      h1: "Men's Water Bottles",
      robots: 'noindex'
    })
  })

  it('ignores SVG titles and finds metadata streamed after </head>', () => {
    const streamed = `<html><head></head><body><svg><title>GitHub</title></svg>
      <title>Manuel Ortiz - Professional Boxer</title><link href="/x/" rel="canonical">
      <link rel="canonical" href="/y/"></body></html>`
    expect(pageFacts(streamed)).toMatchObject({
      title: 'Manuel Ortiz - Professional Boxer',
      canonical: '/x/',
      canonicalCount: 2,
      h1: null,
      robots: null
    })
  })
})

describe('isNoindex', () => {
  it.each([
    ['noindex', true],
    ['noindex, nofollow', true],
    ['NONE', true],
    ['index, follow', false],
    ['max-snippet:-1', false],
    [null, false],
    [undefined, false]
  ])('%s -> %s', (directive, expected) => {
    expect(isNoindex(directive)).toBe(expected)
  })
})

describe('robotsGroups', () => {
  it("reads each user agent's rules, as Next.js writes robots.txt", () => {
    const text = [
      'User-Agent: *',
      'Disallow: /',
      '',
      'User-Agent: AhrefsSiteAudit',
      'Allow: /',
      '',
      'Sitemap: https://staging.boxingundefeated.com/sitemap-index.xml',
      ''
    ].join('\n')
    expect(robotsGroups(text)).toEqual(
      new Map([
        ['*', ['disallow: /']],
        ['ahrefssiteaudit', ['allow: /']]
      ])
    )
  })

  it('gives agents listed together the same rules, and ignores comments', () => {
    const text = 'User-agent: a\nUser-agent: b # both\nDisallow: /x\nAllow: /\n'
    expect(robotsGroups(text)).toEqual(
      new Map([
        ['a', ['disallow: /x', 'allow: /']],
        ['b', ['disallow: /x', 'allow: /']]
      ])
    )
  })
})
