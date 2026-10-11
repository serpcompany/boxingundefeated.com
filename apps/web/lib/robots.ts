import type { MetadataRoute } from 'next'
import type { SiteConfig } from './site-config'
import { toAbsoluteUrl } from './url-utils'

/** What `/robots.txt` says outside production: no crawler may fetch anything. */
export const NON_PRODUCTION_ROBOTS_TXT = 'User-agent: *\nDisallow: /\n'

/**
 * The crawler staging's robots.txt lets in: Ahrefs' Site Audit, which crawls staging with the
 * password (serp `docs/engineering/standards/staging-access.md`).
 */
export const STAGING_AUDIT_CRAWLER = 'AhrefsSiteAudit'

/** Production's crawl rules, which staging gives its auditor too. */
const PRODUCTION_RULES = { allow: '/' } as const

/**
 * `app/robots.ts` is the only robots source. Production allows crawling and lists the sitemap
 * index. Staging, behind its password, disallows every crawler except its auditor, which gets
 * production's rules, and lists staging's own sitemap index. Local disallows everything.
 */
export function robotsFor(config: SiteConfig): MetadataRoute.Robots {
  const sitemap = toAbsoluteUrl(config.origin, '/sitemap-index.xml')
  switch (config.environment) {
    case 'production':
      return { rules: { userAgent: '*', ...PRODUCTION_RULES }, sitemap }
    case 'staging':
      return {
        rules: [
          { userAgent: '*', disallow: '/' },
          { userAgent: STAGING_AUDIT_CRAWLER, ...PRODUCTION_RULES }
        ],
        sitemap
      }
    case 'local':
      return { rules: { userAgent: '*', disallow: '/' } }
  }
}
