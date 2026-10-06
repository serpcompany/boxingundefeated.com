/**
 * The Worker's edge cache for rendered pages, step 4 of lib/worker/handle-request.ts: after the
 * canonical-host redirect, inside the crawl policy, and after the D1 readiness gate, so a stored
 * page never skips any of them. Pages that render on request from D1 (boxer profiles; listings in
 * #11) need it most.
 *
 * Each data center keeps a Cache API copy of a page for `EDGE_CACHE_TTL_SECONDS`, keyed by the
 * Worker version, the D1 dataset version for D1 pages (lib/worker/dataset-gate.ts) and the URL
 * without tracking parameters. A hit is answered here, before OpenNext and D1 run, so it costs no
 * D1 query. A deploy changes the key at once, and a finished re-import within half a minute
 * (`DATASET_STATE_TTL_MS`), so new markup and data need no purge: old entries expire on their own.
 *
 * Only pages: a GET or HEAD for a path ending in `/` (pages end in a slash, files never do), and
 * only a 200 HTML or RSC response is stored. Files from `public/` (sitemaps, ads.txt, the boxer
 * JSON, images), which `assets.run_worker_first` also sends through the Worker, pass through
 * untouched, as do redirects, 404s and errors.
 *
 * Modeled on best.serp.co's `lib/edge-cache/html-cache.ts`; the dataset version plays the part of
 * its catalog epoch. The Cache API has no effect on `*.workers.dev`, so the cache works on custom
 * domains only.
 *
 * No Next.js imports: this runs before OpenNext loads, and every dependency is injected.
 */

/** How long a data center reuses a rendered page. */
export const EDGE_CACHE_TTL_SECONDS = 60 * 60
export const EDGE_CACHE_NAME = 'edge-html'
export const EDGE_CACHE_HEADER = 'x-edge-cache'

const ORIGINAL_CACHE_CONTROL_HEADER = 'x-edge-cache-origin-cache-control'
const CACHE_KEY_ORIGIN = 'https://edge-cache.invalid'

/** First path segments that are framework-internal or (from #12) per-query APIs: never cached. */
const BYPASS_PATH_SEGMENTS = new Set(['_next', 'api', 'cdn-cgi'])

/** Draft-mode cookies: the response may differ from the published page. */
const PREVIEW_COOKIE_PATTERN = /(?:^|;\s*)(?:__prerender_bypass|__next_preview_data)=/u

/** Request headers that select a different React Server Components payload (Next.js `Vary`). */
const RSC_VARIANT_HEADERS = [
  'rsc',
  'next-router-prefetch',
  'next-router-segment-prefetch',
  'next-router-state-tree',
  'next-url'
] as const

/**
 * The only client headers a cacheable request is rendered with, so no request-controlled value
 * (a cookie, a forwarded host, a framework-internal `x-middleware-*` header) can shape a page that
 * the cache then serves to everyone. `host` is set from the URL.
 */
const RENDER_REQUEST_HEADERS = ['accept', 'user-agent', ...RSC_VARIANT_HEADERS] as const

/**
 * Query parameters that only attribute a visit. Pages never read them, so they are left out of the
 * key: a campaign click shares the page everyone else gets instead of rendering its own copy.
 */
const TRACKING_PARAMETER = /^(?:utm_.+|gclid|fbclid|msclkid|ref)$/u

/** A page as HTML, or as the RSC payload of a client-side navigation. */
const PAGE_CONTENT_TYPE = /^(?:text\/html|text\/x-component)\b/u

export type EdgeCacheState = 'HIT' | 'MISS'

export interface EdgeCacheContext {
  waitUntil(promise: Promise<unknown>): void
}

/** What the Worker entry provides: its execution context and the Cache API namespace. */
export interface EdgeCacheRuntime {
  context: EdgeCacheContext
  /** `caches.open(EDGE_CACHE_NAME)`; only called for a cacheable request. */
  openCache: () => Promise<Cache>
}

export interface EdgeCacheOptions {
  openCache: () => Promise<Cache>
  /** The Worker version (`CF_VERSION_METADATA.id`). Without one, nothing is cached. */
  deploymentId: string | undefined
  /** For a page that reads D1: the dataset version its content comes from. */
  dataVersion?: string
  /** False while D1 is being re-imported: stored pages are served, new ones are not stored. */
  store?: boolean
  ttlSeconds?: number
  observe?: (event: EdgeCacheEvent) => void
}

/** One structured log line per page request (files and other pass-through requests log nothing). */
export interface EdgeCacheEvent {
  event: 'edge_cache'
  state: EdgeCacheState | 'BYPASS'
  status: number
  stored?: boolean
}

/** The Worker bindings the cache reads (`wrangler.jsonc` `version_metadata`). */
export interface EdgeCacheEnvironment {
  CF_VERSION_METADATA?: { id?: string }
}

export function isCacheableRequest(request: Request): boolean {
  if (request.method !== 'GET' && request.method !== 'HEAD') return false
  if (request.headers.has('authorization')) return false
  if (PREVIEW_COOKIE_PATTERN.test(request.headers.get('cookie') ?? '')) return false
  const { pathname } = new URL(request.url)
  if (!pathname.endsWith('/')) return false
  return !BYPASS_PATH_SEGMENTS.has(pathname.split('/')[1] ?? '')
}

export function isCacheableResponse(response: Response): boolean {
  return (
    response.status === 200 &&
    !response.headers.has('set-cookie') &&
    PAGE_CONTENT_TYPE.test(response.headers.get('content-type') ?? '')
  )
}

/** The same URL, method and signal, with only the allowlisted headers. */
export function renderRequestFor(request: Request): Request {
  const headers = new Headers()
  for (const name of RENDER_REQUEST_HEADERS) {
    const value = request.headers.get(name)
    if (value !== null) headers.set(name, value)
  }
  headers.set('host', new URL(request.url).host)
  return new Request(request, { headers })
}

async function sha256Hex(value: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value))
  return [...new Uint8Array(digest)].map(byte => byte.toString(16).padStart(2, '0')).join('')
}

/**
 * The key covers everything a page varies on: the Worker version, the dataset version, the host
 * (staging and production differ), the path and query without tracking parameters, and for RSC
 * requests the router headers.
 */
export async function cacheKeyFor(
  request: Request,
  deploymentId: string,
  dataVersion = '-'
): Promise<Request> {
  const url = new URL(request.url)
  for (const name of [...url.searchParams.keys()]) {
    if (TRACKING_PARAMETER.test(name)) url.searchParams.delete(name)
  }
  const variant = request.headers.has('rsc')
    ? `rsc-${(
        await sha256Hex(
          RSC_VARIANT_HEADERS.map(name => `${name}:${request.headers.get(name) ?? ''}`).join('\n')
        )
      ).slice(0, 32)}`
    : 'document'
  const key = [
    CACHE_KEY_ORIGIN,
    encodeURIComponent(deploymentId),
    encodeURIComponent(dataVersion),
    variant,
    encodeURIComponent(url.host)
  ].join('/')
  return new Request(`${key}${url.pathname}${url.search}`, { method: 'GET' })
}

function withState(response: Response, state: EdgeCacheState): Response {
  const headers = new Headers(response.headers)
  headers.set(EDGE_CACHE_HEADER, state)
  return new Response(response.body, {
    headers,
    status: response.status,
    statusText: response.statusText
  })
}

/** The stored copy is cacheable for the TTL; the visitor-facing `cache-control` is kept aside. */
function storedCopy(response: Response, ttlSeconds: number): Response {
  const headers = new Headers(response.headers)
  const original = headers.get('cache-control')
  if (original) headers.set(ORIGINAL_CACHE_CONTROL_HEADER, original)
  headers.set('cache-control', `public, max-age=${ttlSeconds}`)
  return new Response(response.body, {
    headers,
    status: response.status,
    statusText: response.statusText
  })
}

function servedCopy(cached: Response, method: string): Response {
  const headers = new Headers(cached.headers)
  const original = headers.get(ORIGINAL_CACHE_CONTROL_HEADER)
  headers.delete(ORIGINAL_CACHE_CONTROL_HEADER)
  if (original) headers.set('cache-control', original)
  else headers.delete('cache-control')
  headers.delete('age')
  headers.delete('cf-cache-status')
  headers.set(EDGE_CACHE_HEADER, 'HIT')
  return new Response(method === 'HEAD' ? null : cached.body, {
    headers,
    status: cached.status,
    statusText: cached.statusText
  })
}

/**
 * Answers a page request from the cache when it can, otherwise from `render`, storing a 200 page
 * in the background; those responses carry `x-edge-cache: HIT` or `MISS`. Any other request is
 * passed to `render` as sent, and its response is returned as it is.
 */
export async function withEdgeCache(
  request: Request,
  context: EdgeCacheContext,
  options: EdgeCacheOptions,
  render: (request: Request) => Promise<Response>
): Promise<Response> {
  if (!isCacheableRequest(request)) return render(request)
  const observe = options.observe ?? (() => {})
  if (!options.deploymentId) {
    const response = await render(request)
    observe({ event: 'edge_cache', state: 'BYPASS', status: response.status })
    return response
  }

  const cache = await options.openCache()
  const key = await cacheKeyFor(request, options.deploymentId, options.dataVersion)
  const cached = await cache.match(key).catch(() => undefined)
  if (cached) {
    observe({ event: 'edge_cache', state: 'HIT', status: cached.status })
    return servedCopy(cached, request.method)
  }

  const response = await render(renderRequestFor(request))
  const stored =
    options.store !== false && request.method === 'GET' && isCacheableResponse(response)
  if (stored) {
    const copy = storedCopy(response.clone(), options.ttlSeconds ?? EDGE_CACHE_TTL_SECONDS)
    context.waitUntil(cache.put(key, copy).catch(() => undefined))
  }
  observe({ event: 'edge_cache', state: 'MISS', status: response.status, stored })
  return withState(response, 'MISS')
}
