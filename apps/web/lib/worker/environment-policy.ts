/**
 * The crawl policy the Worker applies per request, from its runtime `SITE_ENVIRONMENT` var
 * (`wrangler.jsonc` `vars`). Only an explicit `production` is production: a missing or misspelled
 * var is not. Outside production, `/robots.txt` disallows every crawler and every response the
 * Worker answers carries `X-Robots-Tag: noindex`.
 *
 * This is the runtime half. The prerendered HTML carries the build-time half (the robots meta tag,
 * canonicals and Google Tag Manager, from lib/site-config.ts), so a build and the environment
 * that serves it must use the same SITE_ENVIRONMENT. If they don't, this policy still keeps a
 * non-production runtime out of the index.
 *
 * `worker.ts` wires it in front of the OpenNext handler. It has no Next.js imports, so it runs
 * before OpenNext loads. Static files under `public/` are served from the assets binding before
 * the Worker runs and don't get the header; robots.txt still disallows them.
 */
import { NON_PRODUCTION_ROBOTS_TXT } from '../robots'
import { NON_PRODUCTION_ROBOTS_TAG, parseSiteEnvironment } from '../site-config'

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
  handle: () => Promise<Response>
): Promise<Response> {
  if (isProductionRuntime(env)) {
    return handle()
  }

  const isRead = request.method === 'GET' || request.method === 'HEAD'
  if (isRead && new URL(request.url).pathname === '/robots.txt') {
    return nonProductionRobotsTxt(request)
  }

  return withNoindex(await handle())
}
