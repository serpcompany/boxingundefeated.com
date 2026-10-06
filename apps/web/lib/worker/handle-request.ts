/**
 * The Worker's request pipeline. `worker.ts` passes each request here with `serve`, the handler
 * that `opennextjs-cloudflare build` generates. In order:
 *
 * 1. Canonical host: with `CANONICAL_HOST_REDIRECT=on`, `www.boxingundefeated.com` and
 *    `*.workers.dev` get one 308 to the environment's origin, already in canonical slash form
 *    (lib/routing/canonical-host.ts). Requests with the smoke-test header are exempt.
 * 2. The environment's crawl policy (lib/worker/environment-policy.ts). It wraps the steps below,
 *    so a 503 or a page from the edge cache gets the same noindex header as a rendered page.
 *    `/api/search` and `/api/search/` are answered here, by `runtime.searchApi`
 *    (lib/worker/search-api.ts), which applies the readiness gate and its own cache.
 * 3. For pages that read D1, the readiness gate (lib/worker/dataset-gate.ts): 503 with
 *    `Retry-After` until D1 holds a finished import, and the import generation for the cache key.
 * 4. The edge cache (lib/worker/edge-cache.ts), for pages only: a stored copy, or `serve` and then
 *    store a 200 page. Files, redirects, 404s and errors pass through untouched.
 * 5. `serve`: OpenNext applies the trailing-slash `redirects()` from next.config.ts
 *    (lib/routing/trailing-slash.ts), then serves the page, or the file from `public/` through
 *    its asset resolver.
 *
 * `assets.run_worker_first` in wrangler.jsonc sends every request except /_next/static/ here
 * first, so files from `public/` go through the same pipeline as pages.
 */
import { type CanonicalHostEnvironment, canonicalHostRedirect } from '../routing/canonical-host'
import { type DatasetReadiness, datasetUnavailable, readsD1 } from './dataset-gate'
import {
  type EdgeCacheEnvironment,
  type EdgeCacheEvent,
  type EdgeCacheRuntime,
  withEdgeCache
} from './edge-cache'
import { type WorkerEnvironment, withEnvironmentPolicy } from './environment-policy'
import { isSearchApiRequest } from './search-api'

export type WorkerRequestEnvironment = WorkerEnvironment &
  CanonicalHostEnvironment &
  EdgeCacheEnvironment

export interface WorkerRuntime {
  edgeCache?: EdgeCacheRuntime
  /** Whether D1 can serve D1 pages (`DatasetReadinessMemo.current`). Without it, no gate. */
  datasetReadiness?: () => Promise<DatasetReadiness>
  log?: (event: EdgeCacheEvent | DatasetUnavailableEvent) => void
  /** `GET /api/search` on D1 (`d1SearchApi`). Without it, the request goes to OpenNext. */
  searchApi?: (request: Request) => Promise<Response>
}

export interface DatasetUnavailableEvent {
  event: 'dataset_unavailable'
  reason: string
}

/**
 * `serve` renders the request it is given: the client's, or for a cacheable page the edge cache's
 * copy with allowlisted headers. Without `runtime.edgeCache`, nothing is cached.
 */
export function handleWorkerRequest(
  request: Request,
  env: WorkerRequestEnvironment,
  serve: (request: Request) => Promise<Response>,
  runtime: WorkerRuntime = {}
): Promise<Response> {
  const redirect = canonicalHostRedirect(request, env)
  if (redirect) {
    return Promise.resolve(redirect)
  }
  return withEnvironmentPolicy(request, env, async () => {
    if (runtime.searchApi && isSearchApiRequest(request)) return runtime.searchApi(request)
    let dataGeneration: string | undefined
    let store = true
    if (runtime.datasetReadiness && readsD1(request)) {
      const readiness = await runtime.datasetReadiness()
      if (!readiness.ready) {
        runtime.log?.({ event: 'dataset_unavailable', reason: readiness.reason })
        return datasetUnavailable(request)
      }
      dataGeneration = readiness.generation
      store = !readiness.importing
    }
    if (!runtime.edgeCache) return serve(request)
    return withEdgeCache(
      request,
      runtime.edgeCache.context,
      {
        openCache: runtime.edgeCache.openCache,
        deploymentId: env.CF_VERSION_METADATA?.id,
        dataGeneration,
        store,
        observe: runtime.log
      },
      serve
    )
  })
}
