import type { MetadataRoute } from 'next'
import { robotsFor } from '@/lib/robots'
import { getSiteConfig } from '@/lib/site-config'

export const dynamic = 'force-static'

// The only robots source. The export writes it to out/robots.txt. In the Worker, worker.ts answers
// /robots.txt itself with Disallow when the runtime is not production
// (lib/worker/environment-policy.ts), so this file is served only by a production Worker.
export default function robots(): MetadataRoute.Robots {
  return robotsFor(getSiteConfig())
}
