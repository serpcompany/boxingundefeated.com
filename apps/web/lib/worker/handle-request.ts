/**
 * The Worker's request pipeline. `worker.ts` passes each request here with `serve`, the handler
 * that `opennextjs-cloudflare build` generates. In order:
 *
 * 0. The build guard (lib/worker/build-environment.ts): a 503 for every request when the Worker
 *    was built for another environment than its runtime `SITE_ENVIRONMENT`. Every answer to a
 *    smoke-test request names the build's commit (`BUILD_COMMIT_HEADER`).
 * 1. Staging's password (lib/worker/staging-access.ts): on the staging Worker, on every host,
 *    a request without it gets a 401, except smoke-test requests and `/robots.txt`. A request
 *    that passes goes on without its `Authorization` header, so the edge cache treats it like an
 *    anonymous one. Production and local skip this.
 * 2. Canonical host: with `CANONICAL_HOST_REDIRECT=on`, `www.boxingundefeated.com` and
 *    `*.workers.dev` get one 308 to the environment's origin, already in canonical slash form
 *    (lib/routing/canonical-host.ts). Requests with the smoke-test header are exempt.
 * 3. The environment's crawl policy (lib/worker/environment-policy.ts). It wraps the steps below,
 *    so a 503 or a page from the edge cache gets the same noindex header as a rendered page, and
 *    only a staging request that passed the password goes without it.
 *    A retired path (lib/routing/retired-paths.ts: `/blog`, `/brands` and `/shop` with every
 *    path under them, and `/sitemap-shop.xml`) gets its 410 here, with its own noindex, before
 *    the XML sitemaps, the edge cache and the trailing-slash redirects, so `/blog` answers 410
 *    without a hop and the 410 is never stored.
 *    A boxer photo, `/photos/<sha256>.<ext>`, is answered here from R2 by `runtime.photos`
 *    (lib/worker/photos.ts), without the readiness gate or the page edge cache: it reads no D1,
 *    keeps its own copy in `caches.default`, and browsers keep it for a year.
 *    `/api/search` and `/api/search/` are answered here, by `runtime.searchApi`
 *    (lib/worker/search-api.ts), and the XML sitemaps (`/sitemap-index.xml`, `/sitemap-*.xml`,
 *    and the old `/sitemap.xml` and `/sitemaps/*` URLs) by `runtime.sitemaps`
 *    (lib/worker/sitemaps.ts); each applies the readiness gate and its own cache.
 * 4. For pages that read D1, the readiness gate (lib/worker/dataset-gate.ts): 503 with
 *    `Retry-After` until D1 holds a finished import, and the import generation for the cache key.
 *    While D1 is unreadable, a page cached under the last generation is still served.
 * 5. The edge cache (lib/worker/edge-cache.ts), for pages only: a stored copy, or `serve` and then
 *    store a 200 page. Files, redirects, 404s and errors pass through untouched.
 * 6. For pages that read D1, the not-found page (lib/worker/not-found-page.ts): when `notFound()`
 *    left OpenNext's empty error document, the prerendered `/_not-found` page's body, still a 404.
 * 7. `serve`: OpenNext applies the trailing-slash `redirects()` from next.config.ts
 *    (lib/routing/trailing-slash.ts), then serves the page, or the file from `public/` through
 *    its asset resolver.
 *
 * `assets.run_worker_first` in wrangler.jsonc sends every request except /_next/static/ here
 * first, so files from `public/` go through the same pipeline as pages.
 */
import {
  type CanonicalHostEnvironment,
  canonicalHostRedirect,
  SMOKE_TEST_HEADER
} from '../routing/canonical-host'
import { retiredPathResponse } from '../routing/retired-paths'
import {
  BUILD_COMMIT_HEADER,
  type BuildEnvironmentMismatch,
  type BuildEnvironmentRecord,
  buildEnvironmentMismatch,
  buildEnvironmentUnavailable
} from './build-environment'
import { type DatasetReadiness, datasetUnavailable, readsD1 } from './dataset-gate'
import {
  type EdgeCacheEnvironment,
  type EdgeCacheEvent,
  type EdgeCacheRuntime,
  withEdgeCache
} from './edge-cache'
import { type WorkerEnvironment, withEnvironmentPolicy } from './environment-policy'
import { withNotFoundPage } from './not-found-page'
import { isPhotoRequest } from './photos'
import { isSearchApiRequest } from './search-api'
import { isSitemapRequest } from './sitemaps'
import { type StagingAccessEnvironment, stagingAccess } from './staging-access'

export type WorkerRequestEnvironment = WorkerEnvironment &
  CanonicalHostEnvironment &
  EdgeCacheEnvironment &
  StagingAccessEnvironment

export interface WorkerRuntime {
  /**
   * What `build:worker` recorded (`.open-next/build-environment.json`). worker.ts always passes
   * it; a record without a valid environment fails closed. Without it (tests), no guard.
   */
  buildEnvironment?: Partial<BuildEnvironmentRecord>
  edgeCache?: EdgeCacheRuntime
  /** Whether D1 can serve D1 pages (`DatasetReadinessMemo.current`). Without it, no gate. */
  datasetReadiness?: () => Promise<DatasetReadiness>
  log?: (event: EdgeCacheEvent | DatasetUnavailableEvent | BuildEnvironmentMismatch) => void
  /** `GET /photos/<sha256>.<ext>` from R2 (`r2Photos`). Without it, the request goes to OpenNext. */
  photos?: (request: Request) => Promise<Response>
  /** `GET /api/search` on D1 (`d1SearchApi`). Without it, the request goes to OpenNext. */
  searchApi?: (request: Request) => Promise<Response>
  /** The XML sitemaps on D1 (`d1Sitemaps`). Without it, the request goes to OpenNext. */
  sitemaps?: (request: Request) => Promise<Response>
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
  const response = handle(request, env, serve, runtime)
  const commit = runtime.buildEnvironment?.commit
  if (!commit || !request.headers.has(SMOKE_TEST_HEADER)) return response
  return response.then(answer => {
    // The Workers idiom: copies status, headers and Workers-only fields into a mutable response.
    const tagged = new Response(answer.body, answer)
    tagged.headers.set(BUILD_COMMIT_HEADER, commit)
    return tagged
  })
}

async function handle(
  client: Request,
  env: WorkerRequestEnvironment,
  serve: (request: Request) => Promise<Response>,
  runtime: WorkerRuntime
): Promise<Response> {
  if (runtime.buildEnvironment) {
    const mismatch = buildEnvironmentMismatch(runtime.buildEnvironment.siteEnvironment, env)
    if (mismatch) {
      runtime.log?.(mismatch)
      return buildEnvironmentUnavailable(client)
    }
  }
  const access = await stagingAccess(client, env)
  if (access.gate === 'refused') {
    return access.response
  }
  // From here on, a request that passed the password no longer carries it.
  const request = access.gate === 'passed' ? access.request : client
  const redirect = canonicalHostRedirect(request, env)
  if (redirect) {
    return redirect
  }
  const answer = async (): Promise<Response> => {
    const retired = retiredPathResponse(request)
    if (retired) return retired
    if (runtime.photos && isPhotoRequest(request)) return runtime.photos(request)
    const render = readsD1(request) ? (page: Request) => withNotFoundPage(page, serve) : serve
    if (runtime.searchApi && isSearchApiRequest(request)) return runtime.searchApi(request)
    if (runtime.sitemaps && isSitemapRequest(request)) return runtime.sitemaps(request)
    let dataGeneration: string | undefined
    let store = true
    if (runtime.datasetReadiness && readsD1(request)) {
      const readiness = await runtime.datasetReadiness()
      if (!readiness.ready) {
        runtime.log?.({ event: 'dataset_unavailable', reason: readiness.reason })
        if (!readiness.lastGeneration || !runtime.edgeCache) return datasetUnavailable(request)
        // Stale if error: the last good copy, or the 503 when there is none. Nothing is rendered.
        return withEdgeCache(
          request,
          runtime.edgeCache.context,
          {
            openCache: runtime.edgeCache.openCache,
            deploymentId: env.CF_VERSION_METADATA?.id,
            dataGeneration: readiness.lastGeneration,
            store: false,
            observe: runtime.log
          },
          async () => datasetUnavailable(request)
        )
      }
      dataGeneration = readiness.generation
      store = !readiness.importing
    }
    if (!runtime.edgeCache) return render(request)
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
      render
    )
  }
  return withEnvironmentPolicy(request, env, answer, access.gate)
}
