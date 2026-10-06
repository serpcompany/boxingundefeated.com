import type { MetadataRoute } from 'next'
import type { SiteConfig } from './site-config'
import { toAbsoluteUrl } from './url-utils'

/** What `/robots.txt` says outside production: no crawler may fetch anything. */
export const NON_PRODUCTION_ROBOTS_TXT = 'User-agent: *\nDisallow: /\n'

/**
 * `app/robots.ts` is the only robots source. Production allows crawling and lists the sitemap
 * index; every other environment disallows everything.
 */
export function robotsFor(config: SiteConfig): MetadataRoute.Robots {
  if (!config.isProduction) {
    return { rules: { userAgent: '*', disallow: '/' } }
  }

  return {
    rules: { userAgent: '*', allow: '/' },
    sitemap: toAbsoluteUrl(config.origin, '/sitemap-index.xml')
  }
}
