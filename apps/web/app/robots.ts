import type { MetadataRoute } from 'next'
import { toAbsoluteUrl } from '@/lib/url-utils'

export const dynamic = 'force-static'

export default function robots(): MetadataRoute.Robots {
  const baseUrl =
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.NEXT_PUBLIC_WEB_URL ||
    (process.env.NODE_ENV === 'production'
      ? 'https://boxingundefeated.com'
      : 'http://localhost:3000')

  return {
    rules: {
      userAgent: '*',
      allow: '/'
    },
    sitemap: toAbsoluteUrl(baseUrl, '/sitemap-index.xml')
  }
}
