import type { Metadata } from 'next'
import type { ProfileBoxer } from './boxer-data'
import { getSiteConfig, NON_PRODUCTION_ROBOTS_TAG, SITE_NAME, type SiteConfig } from './site-config'
import { htmlToPlainText } from './text'

/** The longest meta description, in characters, the ellipsis of a cut one included. */
export const MAX_META_DESCRIPTION_LENGTH = 155

/** The not-found page's title before the site name, the same for every 404. */
export const NOT_FOUND_TITLE = 'Page Not Found'

const rootDescription =
  'Comprehensive database of professional boxers with statistics, records, and fight history.'
const openGraphImage = '/opengraph-image.png'
const ellipsis = '\u2026'

/** Characters a cut description shouldn't end on before its ellipsis. */
const DANGLING_PUNCTUATION = /[\s,;:.!?\-\u2013\u2014([{"'\u201c\u2018]+$/u

/**
 * `text`, whose whitespace is already collapsed, cut on a word boundary to at most `maxLength`
 * characters with an ellipsis; uncut, and without one, when it fits. A first word longer than the
 * limit is cut mid-word.
 */
function truncateOnWordBoundary(text: string, maxLength: number): string {
  if (text.length <= maxLength) {
    return text
  }

  const room = maxLength - ellipsis.length
  // A space at `room` means the words before it fit exactly.
  const lastSpace = text.lastIndexOf(' ', room)
  let cut = text.slice(0, lastSpace > 0 ? lastSpace : room)

  // Never split a surrogate pair (an emoji) on a mid-word cut.
  const lastCodeUnit = cut.charCodeAt(cut.length - 1)
  if (lastCodeUnit >= 0xd800 && lastCodeUnit <= 0xdbff) {
    cut = cut.slice(0, -1)
  }

  return `${cut.replace(DANGLING_PUNCTUATION, '') || cut}${ellipsis}`
}

/**
 * A page's meta description, which is its `og:description` and `twitter:description` as well:
 * plain text with its whitespace collapsed, at most `MAX_META_DESCRIPTION_LENGTH` characters, cut
 * on a word boundary. The site's own description when there's none.
 */
export function createMetaDescription(description?: string | null): string {
  const normalized = (description || '').replace(/\s+/g, ' ').trim() || rootDescription

  return truncateOnWordBoundary(normalized, MAX_META_DESCRIPTION_LENGTH)
}

/**
 * A boxer's meta description: the start of their bio as plain text (the bio is HTML), or, for a
 * boxer without one, `Professional boxing record and statistics for <name>.`
 *
 * The bio's blocks run together as sentences: one that ends on a letter or digit, such as the
 * `<name>: The Rising Star of Boxing` title that opens about a third of the bios, gets a full stop.
 */
export function createBoxerMetaDescription(boxer: Pick<ProfileBoxer, 'name' | 'bio'>): string {
  const bio = htmlToPlainText(boxer.bio || '')
    .split('\n')
    .map(block => (/[\p{L}\p{N}]$/u.test(block) ? `${block}.` : block))
    .join(' ')

  return createMetaDescription(
    bio || `Professional boxing record and statistics for ${boxer.name}.`
  )
}

/** The longest title, in characters, that keeps the site name on a page with `siteNameIfFits`. */
export const MAX_TITLE_LENGTH = 60

export interface PageTitleOptions {
  /**
   * Leave out ` - Boxing Undefeated` when the whole title would be longer than `MAX_TITLE_LENGTH`,
   * rather than cut the page's own title: a boxer's name always shows in full (#87).
   */
  siteNameIfFits?: boolean
}

/**
 * A page's document title, `<page title> - Boxing Undefeated`. Every page has one but the
 * homepage, whose title is its own (app/page.tsx). With `siteNameIfFits`, a title that would be
 * longer than `MAX_TITLE_LENGTH` is the page title alone.
 */
export function pageTitle(
  title: string,
  { siteNameIfFits = false }: PageTitleOptions = {}
): string {
  const withSiteName = `${title} - ${SITE_NAME}`

  return siteNameIfFits && withSiteName.length > MAX_TITLE_LENGTH ? title : withSiteName
}

export interface PageMetadataInput {
  /** The page's title. `createPageMetadata` adds the site name; `createDocumentMetadata` doesn't. */
  title: string
  /** The meta description, capped by `createMetaDescription`; the site's own when missing. */
  description?: string | null
  /**
   * The page's canonical URL, absolute or resolved against the root layout's `metadataBase`. It is
   * the page's `og:url` as well.
   */
  canonical?: string
}

/**
 * The metadata of a page whose `title` is the whole document title, as given: the root layout's
 * and the homepage's. Every other page uses `createPageMetadata`.
 *
 * `og:title` and `twitter:title` are the title, and their descriptions the meta description.
 * Next.js replaces a layout's `openGraph` and `twitter` with a page's whole, never field by field,
 * so a page sets both in full or keeps the root's: a page with only its own `title` would be
 * shared as the bare site name.
 */
export function createDocumentMetadata({
  title,
  description,
  canonical
}: PageMetadataInput): Metadata {
  const metaDescription = createMetaDescription(description)

  return {
    title,
    description: metaDescription,
    ...(canonical ? { alternates: { canonical } } : {}),
    openGraph: {
      title,
      description: metaDescription,
      ...(canonical ? { url: canonical } : {}),
      siteName: SITE_NAME,
      type: 'website',
      images: [
        {
          url: openGraphImage,
          width: 1200,
          height: 630,
          alt: SITE_NAME
        }
      ]
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description: metaDescription,
      images: [openGraphImage]
    }
  }
}

/** A page's metadata, titled `<title> - Boxing Undefeated` (`pageTitle`, with its options). */
export function createPageMetadata({
  title,
  siteNameIfFits,
  ...page
}: PageMetadataInput & PageTitleOptions): Metadata {
  return createDocumentMetadata({ ...page, title: pageTitle(title, { siteNameIfFits }) })
}

/**
 * Every 404's metadata: the not-found page's (app/not-found.tsx), which is the first HTML of every
 * 404, and that of each page that calls `notFound()`, so a client-side navigation to one shows the
 * same title.
 */
export function createNotFoundMetadata(): Metadata {
  return createPageMetadata({ title: NOT_FOUND_TITLE })
}

/**
 * The root layout's metadata. A local build adds `<meta name="robots" content="noindex">`; no page
 * sets its own `robots`, so every page inherits it. Staging's HTML has none, as production's: the
 * edge cache serves the same page to requests with and without staging's password, so the Worker
 * sends staging's noindex as an `X-Robots-Tag` header instead (lib/worker/environment-policy.ts).
 *
 * Its title is the bare site name, which every page replaces with its own.
 *
 * It sets no canonical and no `og:url`: every page inherits these values, and a layout canonical
 * would point every page without its own at the homepage. Each page sets its own canonical. The
 * homepage renders both tags itself as the bare origin (app/page.tsx), because with
 * `trailingSlash` the metadata API would write `https://boxingundefeated.com/`.
 */
export function createRootMetadata(config: SiteConfig = getSiteConfig()): Metadata {
  return {
    ...(config.environment === 'local' ? { robots: NON_PRODUCTION_ROBOTS_TAG } : {}),
    ...createDocumentMetadata({ title: SITE_NAME }),
    metadataBase: new URL(config.origin)
  }
}
