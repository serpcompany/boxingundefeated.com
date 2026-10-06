import { describe, expect, it } from 'vitest'
import { isNoindex, pageFacts } from './html'

const page = `<!DOCTYPE html><html><head><meta charSet="utf-8"/>
<title>Men&#x27;s Water Bottles - Boxing Directory</title>
<meta name="robots" content="noindex"/>
<link rel="canonical" href="https://boxingundefeated.com/shop/best/men&#x27;s-water-bottles/"/>
<meta property="og:url" content="https://boxingundefeated.com"/></head>
<body><svg><title>Facebook</title></svg><h1 class="x">Men&#x27;s <span>Water</span>
  Bottles</h1><h1>Second</h1></body></html>`

describe('pageFacts', () => {
  it('reads the document title, canonical, og:url, first H1 and robots meta', () => {
    expect(pageFacts(page)).toEqual({
      title: "Men's Water Bottles - Boxing Directory",
      canonical: "https://boxingundefeated.com/shop/best/men's-water-bottles/",
      canonicalCount: 1,
      ogUrl: 'https://boxingundefeated.com',
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
