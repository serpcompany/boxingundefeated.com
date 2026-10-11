import { describe, expect, it } from 'vitest'
import {
  createBoxerMetaDescription,
  createDocumentMetadata,
  createMetaDescription,
  createNotFoundMetadata,
  createPageMetadata,
  createRootMetadata,
  MAX_META_DESCRIPTION_LENGTH,
  MAX_TITLE_LENGTH,
  pageTitle
} from './metadata'
import { getSiteOrigin } from './site-config'

describe('metadata helpers', () => {
  it('defines default Open Graph and Twitter metadata at the root', () => {
    const metadata = createRootMetadata()
    const description = metadata.description

    // Every page replaces it with its own (app/page-titles.test.tsx).
    expect(metadata.title).toBe('Boxing Undefeated')
    expect(description).toEqual(expect.any(String))
    expect(metadata.metadataBase).toEqual(new URL(getSiteOrigin()))
    expect(metadata.openGraph).toEqual(
      expect.objectContaining({
        title: metadata.title,
        description,
        siteName: 'Boxing Undefeated',
        type: 'website'
      })
    )
    // Inherited by every page, so the root sets neither: the homepage renders its own.
    expect(metadata.alternates?.canonical).toBeUndefined()
    expect(metadata.openGraph).not.toHaveProperty('url')
    expect(metadata.openGraph?.images).toEqual([
      expect.objectContaining({
        url: '/opengraph-image.png',
        alt: 'Boxing Undefeated'
      })
    ])
    expect(metadata.twitter).toEqual(
      expect.objectContaining({
        card: 'summary_large_image',
        title: metadata.title,
        description
      })
    )
    expect(metadata.twitter?.images).toEqual(['/opengraph-image.png'])
  })

  it('titles a page `<page title> - Boxing Undefeated`', () => {
    expect(pageTitle('Boxers Directory - Page 2')).toBe(
      'Boxers Directory - Page 2 - Boxing Undefeated'
    )
  })

  it('keeps the site name on a title of any length unless the page lets it go', () => {
    const long = 'Carlos Antonio Rodriguez Moreno Record, Stats & Fights'

    expect(pageTitle(long)).toBe(`${long} - Boxing Undefeated`)
    expect(pageTitle(long, { siteNameIfFits: false })).toBe(`${long} - Boxing Undefeated`)
  })

  it('with siteNameIfFits, keeps the site name on a title of exactly 60 characters', () => {
    const title = pageTitle('Jonathan Gonzalez Record, Stats & Fights', { siteNameIfFits: true })

    expect(MAX_TITLE_LENGTH).toBe(60)
    expect(title).toBe('Jonathan Gonzalez Record, Stats & Fights - Boxing Undefeated')
    expect(title).toHaveLength(MAX_TITLE_LENGTH)
    expect(pageTitle('Ana Alpha Record, Stats & Fights', { siteNameIfFits: true })).toBe(
      'Ana Alpha Record, Stats & Fights - Boxing Undefeated'
    )
  })

  it('with siteNameIfFits, drops the site name past 60 characters and never cuts the title', () => {
    // 61 characters with the site name.
    expect('Demetrius Williams Record, Stats & Fights - Boxing Undefeated').toHaveLength(61)
    expect(pageTitle('Demetrius Williams Record, Stats & Fights', { siteNameIfFits: true })).toBe(
      'Demetrius Williams Record, Stats & Fights'
    )

    const long = 'Carlos Antonio Rodriguez Moreno Record, Stats & Fights'
    expect(pageTitle(long, { siteNameIfFits: true })).toBe(long)
  })

  it('gives the dropped-site-name title to og:title and twitter:title as well', () => {
    const title = "Hassan N'Dam N'Jikam Record, Stats & Fights"
    const metadata = createPageMetadata({ title, siteNameIfFits: true })

    expect(metadata.title).toBe(title)
    expect(metadata.openGraph?.title).toBe(title)
    expect(metadata.twitter?.title).toBe(title)
    expect(metadata).not.toHaveProperty('siteNameIfFits')
  })

  it("gives a page's og:title and twitter:title its title, and its og:url its canonical", () => {
    const canonical = 'https://boxingundefeated.com/divisions/heavy/page/2/'
    const metadata = createPageMetadata({
      title: 'Heavyweight Boxers - Page 2',
      description: 'Browse page 2 of   professional heavyweight boxers.',
      canonical
    })
    const title = 'Heavyweight Boxers - Page 2 - Boxing Undefeated'
    const description = 'Browse page 2 of professional heavyweight boxers.'
    const root = createRootMetadata()

    expect(metadata).toEqual({
      title,
      description,
      alternates: { canonical },
      openGraph: { ...root.openGraph, title, description, url: canonical },
      twitter: { ...root.twitter, title, description }
    })
  })

  it("leaves out a canonical and og:url the page doesn't have, and keeps the site's description", () => {
    const metadata = createPageMetadata({ title: 'Search Boxers' })

    expect(metadata.title).toBe('Search Boxers - Boxing Undefeated')
    expect(metadata.description).toBe(createRootMetadata().description)
    expect(metadata.openGraph?.description).toBe(metadata.description)
    expect(metadata).not.toHaveProperty('alternates')
    expect(metadata.openGraph).not.toHaveProperty('url')
  })

  it('uses a document title as given: the homepage keeps its own', () => {
    const metadata = createDocumentMetadata({ title: 'Boxing Undefeated - Professional Boxers' })

    expect(metadata.title).toBe('Boxing Undefeated - Professional Boxers')
    expect(metadata.openGraph?.title).toBe(metadata.title)
    expect(metadata.twitter?.title).toBe(metadata.title)
  })

  it('titles every 404 Page Not Found, without a canonical', () => {
    const metadata = createNotFoundMetadata()

    expect(metadata.title).toBe('Page Not Found - Boxing Undefeated')
    expect(metadata.openGraph?.title).toBe(metadata.title)
    expect(metadata.twitter?.title).toBe(metadata.title)
    expect(metadata).not.toHaveProperty('alternates')
  })
})

describe('createMetaDescription', () => {
  it('keeps a description of exactly 155 characters whole, without an ellipsis', () => {
    const description = `${'word '.repeat(30)}abcde`

    expect(MAX_META_DESCRIPTION_LENGTH).toBe(155)
    expect(description).toHaveLength(155)
    expect(createMetaDescription(description)).toBe(description)
  })

  it('cuts a longer one on a word boundary, with an ellipsis, to at most 155 characters', () => {
    // 156 characters: the last word doesn't fit with the ellipsis after it.
    const description = `${'word '.repeat(30)}abcdef`
    const cut = createMetaDescription(description)

    expect(cut).toBe(`${'word '.repeat(30).trimEnd()}\u2026`)
    expect(cut).toHaveLength(150)
  })

  it('cuts where the words before the ellipsis fit exactly', () => {
    // A space at index 154: the 154 characters before it and the ellipsis make 155.
    const description = `${'a'.repeat(154)} next words`

    expect(createMetaDescription(description)).toBe(`${'a'.repeat(154)}\u2026`)
  })

  it('leaves no punctuation dangling before the ellipsis', () => {
    const description = `${'word '.repeat(29)}endings, and more words follow here`

    expect(createMetaDescription(description)).toBe(`${'word '.repeat(29)}endings\u2026`)
  })

  it.each([
    ['straight', '"', '"'],
    ['curly', '\u201c', '\u201d'],
    ['single curly', '\u2018', '\u2019']
  ])('keeps the %s closing quote that ends a cut description', (_name, open, close) => {
    // The quoted phrase ends at 149 characters; the next word doesn't fit after it.
    const phrase = `${open}Mi Vida Loca${close}`
    const description = `${'word '.repeat(27)}${phrase} fighter`

    expect(createMetaDescription(description)).toBe(`${'word '.repeat(27)}${phrase}\u2026`)
  })

  it.each([
    ['straight', '"', '"'],
    ['curly', '\u201c', '\u201d']
  ])(
    'cuts before the opening %s quote of a phrase it would leave open, keeping 100 characters or more',
    (_name, open, close) => {
      const description = `${'word '.repeat(22)}nickname ${open}${'quoted '.repeat(10)}end${close}`

      expect(createMetaDescription(description)).toBe(`${'word '.repeat(22)}nickname\u2026`)
    }
  )

  it.each([
    ['straight', '"', '"'],
    ['curly', '\u201c', '\u201d']
  ])(
    'keeps a phrase open, the ellipsis inside it, when cutting before its %s quote leaves under 100 characters',
    (_name, open, close) => {
      const description = `${'word '.repeat(10)}nickname ${open}${'quoted '.repeat(20)}end${close}`
      const cut = createMetaDescription(description)

      expect(cut).toBe(
        `${'word '.repeat(10)}nickname ${open}${Array(13).fill('quoted').join(' ')}\u2026`
      )
      expect(cut.length).toBeLessThanOrEqual(MAX_META_DESCRIPTION_LENGTH)
    }
  )

  it('does not take an apostrophe for an open quote', () => {
    const description = `${'word '.repeat(22)}Tapia's ${'quoted '.repeat(10)}end`

    expect(createMetaDescription(description)).toBe(
      `${'word '.repeat(22)}Tapia's ${'quoted '.repeat(4)}quoted\u2026`
    )
  })

  it('cuts a single word longer than the limit mid-word', () => {
    expect(createMetaDescription('x'.repeat(200))).toBe(`${'x'.repeat(154)}\u2026`)
  })

  it("collapses whitespace and falls back to the site's description", () => {
    expect(createMetaDescription('  Browse \n\t boxers. ')).toBe('Browse boxers.')
    expect(createMetaDescription('   ')).toBe(createRootMetadata().description)
    expect(createMetaDescription(null)).toBe(createRootMetadata().description)
  })
})

describe('createBoxerMetaDescription', () => {
  it('builds it from the bio as plain text: no tags, entities decoded', () => {
    const boxer = {
      name: 'Manuel Ortiz',
      bio: '<p>Manuel <strong>Ortiz</strong> &amp; his <em>team</em>&#39;s &lt;great&gt; run.</p>'
    }

    expect(createBoxerMetaDescription(boxer)).toBe("Manuel Ortiz & his team's <great> run.")
  })

  it('runs the blocks together as sentences, closing a title block with a full stop', () => {
    const boxer = {
      name: 'Jeff Franklin',
      bio:
        '<p>Jeff Franklin: The Rising Star</p>\n\n<p>When it comes to boxing, few are as exciting.</p>' +
        '<h2>Career highlights:</h2><p>Won 20<br>Lost 2</p>'
    }

    expect(createBoxerMetaDescription(boxer)).toBe(
      'Jeff Franklin: The Rising Star. When it comes to boxing, few are as exciting. ' +
        'Career highlights: Won 20. Lost 2.'
    )
  })

  it('closes a block that ends on a quote or a bracket with a full stop as well', () => {
    const boxer = {
      name: 'Rodolfo Jimenez',
      bio:
        '<p>The Rise of "Zurdo"</p><p>Boxing has always been a sport of grit.</p>' +
        '<h2>Title \u201cContender\u201d</h2><h2>Record (Retired)</h2><p>Stats [updated]</p>' +
        "<p>The champs'</p><p>Done.</p>"
    }

    expect(createBoxerMetaDescription(boxer)).toBe(
      'The Rise of "Zurdo". Boxing has always been a sport of grit. Title \u201cContender\u201d. ' +
        "Record (Retired). Stats [updated]. The champs'. Done."
    )
  })

  it('cuts a long bio on a word boundary to at most 155 characters, with an ellipsis', () => {
    const boxer = { name: 'Jesse Hart', bio: `<p>${'A long boxing career. '.repeat(20)}</p>` }

    const description = createBoxerMetaDescription(boxer)

    expect(description.length).toBeLessThanOrEqual(MAX_META_DESCRIPTION_LENGTH)
    expect(description).toBe(`${'A long boxing career. '.repeat(6)}A long boxing career\u2026`)
    expect(description).not.toMatch(/[<>]|&\w+;/)
  })

  it('falls back to the template for a boxer without a usable bio', () => {
    const template = 'Professional boxing record and statistics for Abdullah Mason.'

    expect(createBoxerMetaDescription({ name: 'Abdullah Mason', bio: null })).toBe(template)
    expect(createBoxerMetaDescription({ name: 'Abdullah Mason', bio: '' })).toBe(template)
    expect(createBoxerMetaDescription({ name: 'Abdullah Mason', bio: '<p> &nbsp; </p>' })).toBe(
      template
    )
  })

  it('gives the same plain description to the meta, og and twitter descriptions', () => {
    const description = createBoxerMetaDescription({
      name: 'Ana Alpha',
      bio: '<p>Ana&nbsp;Alpha<br/>Southpaw</p>'
    })
    const metadata = createPageMetadata({ title: 'Ana Alpha Record, Stats & Fights', description })

    expect(description).toBe('Ana Alpha. Southpaw.')
    expect(metadata.description).toBe(description)
    expect(metadata.openGraph?.description).toBe(description)
    expect(metadata.twitter?.description).toBe(description)
  })
})
