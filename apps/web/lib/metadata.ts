import type { Metadata } from 'next'
import type { ProfileBoxer } from './boxer-data'
import { getSiteConfig, NON_PRODUCTION_ROBOTS_TAG, SITE_NAME, type SiteConfig } from './site-config'

export const MAX_META_DESCRIPTION_LENGTH = 160

/** The not-found page's title before the site name, the same for every 404. */
export const NOT_FOUND_TITLE = 'Page Not Found'

const rootDescription =
  'Comprehensive database of professional boxers with statistics, records, and fight history.'
const openGraphImage = '/opengraph-image.png'

export function createMetaDescription(description?: string | null): string {
  const normalized = (description || rootDescription).replace(/\s+/g, ' ').trim() || rootDescription

  if (normalized.length <= MAX_META_DESCRIPTION_LENGTH) {
    return normalized
  }

  return `${normalized.slice(0, MAX_META_DESCRIPTION_LENGTH - 3).trimEnd()}...`
}

export function createBoxerMetaDescription(boxer: Pick<ProfileBoxer, 'name' | 'bio'>): string {
  return createMetaDescription(
    `Professional boxing record and statistics for ${boxer.name}. ${boxer.bio || ''}`
  )
}

/**
 * A page's document title, `<page title> - Boxing Undefeated`. Every page has one but the
 * homepage, whose title is its own (app/page.tsx).
 */
export function pageTitle(title: string): string {
  return `${title} - ${SITE_NAME}`
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

/** A page's metadata, titled `<title> - Boxing Undefeated` (`pageTitle`). */
export function createPageMetadata({ title, ...page }: PageMetadataInput): Metadata {
  return createDocumentMetadata({ ...page, title: pageTitle(title) })
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
