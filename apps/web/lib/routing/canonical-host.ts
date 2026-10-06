/**
 * The canonical-host redirect (serpcompany/serp `docs/engineering/standards/
 * environment-configuration.md`, "Canonical hosts"), applied by `worker.ts` to every request
 * before the crawl policy and OpenNext.
 *
 * When the Worker's `CANONICAL_HOST_REDIRECT` var is exactly `on` and its `SITE_ENVIRONMENT` is a
 * deployed one (`staging` or `production`), a request for `www.boxingundefeated.com` or any
 * `*.workers.dev` host (the workers.dev URL and preview URLs) gets one 308 to that environment's
 * origin. The path is already in canonical form (`lib/routing/trailing-slash.ts`), so
 * `www.boxingundefeated.com/about` goes straight to `https://boxingundefeated.com/about/`, and
 * `/api` paths keep exactly the path they asked for. The query string is kept as sent.
 *
 * Requests that carry the smoke-test header are served normally, so CI can test a deployment
 * through its platform host. The header is not a secret: it only reveals the same public site on
 * another host, and search engines never send it.
 *
 * This lives in the Worker rather than in next.config.ts `redirects()` because the switch is a
 * runtime var per Wrangler environment, while `redirects()` is fixed when the Worker is built. It
 * has no Next.js imports, so it runs before OpenNext loads.
 */
import { parseSiteEnvironment, siteOriginFor } from '../site-config'
import { canonicalPathname } from './trailing-slash'

export const SMOKE_TEST_HEADER = 'x-boxingundefeated-smoke-test'

const WWW_HOST = 'www.boxingundefeated.com'
const PLATFORM_HOST_SUFFIX = '.workers.dev'

export interface CanonicalHostEnvironment {
  CANONICAL_HOST_REDIRECT?: string
  SITE_ENVIRONMENT?: string
}

/**
 * The origin non-canonical hosts redirect to, or null when the redirect is off: the switch is not
 * exactly `on`, or the environment is `local`, missing or unknown.
 */
export function canonicalHostOrigin(env: CanonicalHostEnvironment): string | null {
  if (env.CANONICAL_HOST_REDIRECT !== 'on') {
    return null
  }
  const environment = parseSiteEnvironment(env.SITE_ENVIRONMENT)
  if (environment !== 'staging' && environment !== 'production') {
    return null
  }
  return siteOriginFor(environment)
}

/** `www.boxingundefeated.com` and Cloudflare's platform hosts (`*.workers.dev`). */
export function isNonCanonicalHost(hostname: string): boolean {
  const host = hostname.toLowerCase()
  return host === WWW_HOST || host.endsWith(PLATFORM_HOST_SUFFIX)
}

/**
 * A 308 to the canonical origin with the canonical path, or null when the redirect is off, the
 * host is not one to redirect, or the request carries the smoke-test header.
 */
export function canonicalHostRedirect(
  request: Request,
  env: CanonicalHostEnvironment
): Response | null {
  const origin = canonicalHostOrigin(env)
  if (!origin || request.headers.has(SMOKE_TEST_HEADER)) {
    return null
  }

  const url = new URL(request.url)
  if (!isNonCanonicalHost(url.hostname)) {
    return null
  }

  return new Response(null, {
    status: 308,
    headers: { location: `${origin}${canonicalPathname(url.pathname)}${url.search}` }
  })
}
