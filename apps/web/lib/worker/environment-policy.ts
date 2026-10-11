/**
 * The crawl policy the Worker applies per request, from its runtime `SITE_ENVIRONMENT` var
 * (`wrangler.jsonc` `vars`). Only an explicit `production` is production: a missing or misspelled
 * var is not. Outside production, every response the Worker answers carries
 * `X-Robots-Tag: noindex`, and `/robots.txt` disallows every crawler: staging's, the one
 * app/robots.ts renders for its build (lib/robots.ts), still lets its auditor in; local or an
 * unknown environment gets the Worker's own disallow-all, whatever was built.
 *
 * Staging is behind a password (lib/worker/staging-access.ts), so a staging request that passed
 * it gets no noindex: it sees the headers production would send. The noindex is decided here,
 * after the edge cache, from this request alone, so a page stored for a request with the password
 * still reaches a smoke-test request with the noindex. What production also noindexes keeps its
 * own tag: `/api/search` its header, the 404 page its meta tag. Otherwise staging's HTML has no
 * robots meta tag, as in production (lib/metadata.ts), so the header is its only noindex.
 *
 * lib/worker/handle-request.ts runs it in front of the OpenNext handler. It has no Next.js
 * imports, so it runs before OpenNext loads. `assets.run_worker_first` sends the files from
 * `public/` through the Worker too, so they get the header; only the hashed build output under
 * /_next/static/ is served before the Worker runs.
 */
import { NON_PRODUCTION_ROBOTS_TXT } from '../robots'
import { NON_PRODUCTION_ROBOTS_TAG, parseSiteEnvironment } from '../site-config'
import { type StagingAccess, servesAsStaging } from './staging-access'

export interface WorkerEnvironment {
  SITE_ENVIRONMENT?: string
}

export function isProductionRuntime(env: WorkerEnvironment): boolean {
  return parseSiteEnvironment(env.SITE_ENVIRONMENT) === 'production'
}

function nonProductionRobotsTxt(request: Request): Response {
  return new Response(request.method === 'HEAD' ? null : NON_PRODUCTION_ROBOTS_TXT, {
    headers: {
      'cache-control': 'public, max-age=0, must-revalidate',
      'content-type': 'text/plain; charset=utf-8',
      'x-robots-tag': NON_PRODUCTION_ROBOTS_TAG
    }
  })
}

/**
 * Rewraps the response with the Workers idiom, `new Response(body, response)`, which copies the
 * status, status text and headers (into a new, mutable `Headers`) and also the Workers-only
 * fields such as `webSocket`, `cf` and `encodeBody`, so a pre-encoded body or a WebSocket upgrade
 * passes through intact.
 */
function withNoindex(response: Response): Response {
  const wrapped = new Response(response.body, response)
  wrapped.headers.set('x-robots-tag', NON_PRODUCTION_ROBOTS_TAG)
  return wrapped
}

export async function withEnvironmentPolicy(
  request: Request,
  env: WorkerEnvironment,
  handle: () => Promise<Response>,
  access: StagingAccess['gate'] = 'none'
): Promise<Response> {
  if (isProductionRuntime(env)) {
    return handle()
  }

  const isRead = request.method === 'GET' || request.method === 'HEAD'
  if (isRead && new URL(request.url).pathname === '/robots.txt' && !servesAsStaging(env)) {
    return nonProductionRobotsTxt(request)
  }

  const response = await handle()
  // Only a request that passed staging's password goes without; robots.txt never does (exempt).
  return access === 'passed' ? response : withNoindex(response)
}
