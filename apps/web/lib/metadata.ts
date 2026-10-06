import type { Metadata } from 'next'
import type { BoxerMetadata } from './boxers-loader'
import { getSiteConfig, NON_PRODUCTION_ROBOTS_TAG, type SiteConfig } from './site-config'

export const MAX_META_DESCRIPTION_LENGTH = 160

const rootTitle = 'Boxing Directory'
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

export function createBoxerMetaDescription(boxer: Pick<BoxerMetadata, 'name' | 'bio'>): string {
  return createMetaDescription(
    `Professional boxing record and statistics for ${boxer.name}. ${boxer.bio || ''}`
  )
}

/**
 * The root layout's metadata. Outside production it adds `<meta name="robots" content="noindex">`;
 * no page sets its own `robots`, so every page inherits it.
 */
export function createRootMetadata(config: SiteConfig = getSiteConfig()): Metadata {
  const baseUrl = config.origin
  const description = createMetaDescription(rootDescription)

  return {
    ...(config.isProduction ? {} : { robots: NON_PRODUCTION_ROBOTS_TAG }),
    title: rootTitle,
    description,
    metadataBase: new URL(baseUrl),
    alternates: {
      canonical: baseUrl
    },
    openGraph: {
      title: rootTitle,
      description,
      url: baseUrl,
      siteName: 'Boxing Undefeated',
      type: 'website',
      images: [
        {
          url: openGraphImage,
          width: 1200,
          height: 630,
          alt: 'Boxing Undefeated'
        }
      ]
    },
    twitter: {
      card: 'summary_large_image',
      title: rootTitle,
      description,
      images: [openGraphImage]
    }
  }
}
