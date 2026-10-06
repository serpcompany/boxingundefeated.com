/**
 * The Worker's request pipeline. `worker.ts` passes each request here with `serve`, the handler
 * that `opennextjs-cloudflare build` generates. In order:
 *
 * 1. Canonical host: with `CANONICAL_HOST_REDIRECT=on`, `www.boxingundefeated.com` and
 *    `*.workers.dev` get one 308 to the environment's origin, already in canonical slash form
 *    (lib/routing/canonical-host.ts). Requests with the smoke-test header are exempt.
 * 2. The environment's crawl policy (lib/worker/environment-policy.ts). It wraps the steps below,
 *    so a page from the edge cache gets the same noindex header as a rendered one.
 * 3. The edge cache (lib/worker/edge-cache.ts), for pages only: a stored copy, or `serve` and then
 *    store a 200 page. Files, redirects, 404s and errors pass through untouched.
 * 4. `serve`: OpenNext applies the trailing-slash `redirects()` from next.config.ts
 *    (lib/routing/trailing-slash.ts), then serves the page, or the file from `public/` through
 *    its asset resolver.
 *
 * `assets.run_worker_first` in wrangler.jsonc sends every request except /_next/static/ here
 * first, so files from `public/` go through the same pipeline as pages.
 */
import { type CanonicalHostEnvironment, canonicalHostRedirect } from '../routing/canonical-host'
import { type EdgeCacheEnvironment, type EdgeCacheRuntime, withEdgeCache } from './edge-cache'
import { type WorkerEnvironment, withEnvironmentPolicy } from './environment-policy'

export type WorkerRequestEnvironment = WorkerEnvironment &
  CanonicalHostEnvironment &
  EdgeCacheEnvironment

/**
 * `serve` renders the request it is given: the client's, or for a cacheable page the edge cache's
 * copy with allowlisted headers. Without `edgeCache`, nothing is cached.
 */
export function handleWorkerRequest(
  request: Request,
  env: WorkerRequestEnvironment,
  serve: (request: Request) => Promise<Response>,
  edgeCache?: EdgeCacheRuntime
): Promise<Response> {
  const redirect = canonicalHostRedirect(request, env)
  if (redirect) {
    return Promise.resolve(redirect)
  }
  return withEnvironmentPolicy(request, env, () =>
    edgeCache
      ? withEdgeCache(
          request,
          edgeCache.context,
          { openCache: edgeCache.openCache, deploymentId: env.CF_VERSION_METADATA?.id },
          serve
        )
      : serve(request)
  )
}
