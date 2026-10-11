import type { MetadataRoute } from 'next'
import { robotsFor } from '@/lib/robots'
import { getSiteConfig } from '@/lib/site-config'

export const dynamic = 'force-static'

// The only robots source, prerendered for the build's SITE_ENVIRONMENT (lib/robots.ts). The
// production and staging Workers serve it; staging's lets only its auditor in and is served without
// the password (lib/worker/staging-access.ts). A local or unknown runtime answers /robots.txt
// itself with Disallow (lib/worker/environment-policy.ts).
export default function robots(): MetadataRoute.Robots {
  return robotsFor(getSiteConfig())
}
