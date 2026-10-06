/**
 * The Worker's edge cache for rendered responses, applied by `worker.ts` in front of OpenNext.
 * Pages that render on request from D1 (boxer profiles; listings in #11) need it most.
 *
 * Each data center keeps a Cache API copy of a rendered response for `EDGE_CACHE_TTL_SECONDS`,
 * keyed by the Worker version and the URL. A hit is answered here, before OpenNext and D1 run, so
 * it costs no D1 query. A deploy changes the version, so new markup is served at once; a data
 * refresh (a re-import into D1) shows up when the stored copy expires, within the TTL. Nothing
 * needs purging: new keys stop matching old entries, which expire on their own.
 *
 * Modeled on best.serp.co's `lib/edge-cache/html-cache.ts`, without its D1 data epoch: boxer data
 * changes only on an occasional import, so a TTL bounds staleness without a D1 read per request.
 * The Cache API has no effect on `*.workers.dev`, so the cache works once a custom domain is
 * attached; until then every request renders.
 *
 * No Next.js imports: this runs before OpenNext loads, and every dependency is injected.
 */

/** How long a data center reuses a rendered response. */
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
 * (a cookie, a forwarded host, a framework-internal `x-middleware-*` header) can shape a response
 * that the cache then serves to everyone. `host` is set from the URL.
 */
const RENDER_REQUEST_HEADERS = ['accept', 'user-agent', ...RSC_VARIANT_HEADERS] as const

const CACHEABLE_STATUSES = new Set([200, 301, 308, 404])

export type EdgeCacheState = 'BYPASS' | 'HIT' | 'MISS'

export interface EdgeCacheContext {
  waitUntil(promise: Promise<unknown>): void
}

export interface EdgeCacheOptions {
  cache: Cache
  /** The Worker version (`CF_VERSION_METADATA.id`). Without one, nothing is cached. */
  deploymentId: string | undefined
  ttlSeconds?: number
}

/** The Worker bindings the cache reads (`wrangler.jsonc` `version_metadata`). */
export interface EdgeCacheEnvironment {
  CF_VERSION_METADATA?: { id?: string }
}

export function isCacheableRequest(request: Request): boolean {
  if (request.method !== 'GET' && request.method !== 'HEAD') return false
  if (request.headers.has('authorization')) return false
  if (PREVIEW_COOKIE_PATTERN.test(request.headers.get('cookie') ?? '')) return false
  const firstSegment = new URL(request.url).pathname.split('/')[1] ?? ''
  return !BYPASS_PATH_SEGMENTS.has(firstSegment)
}

export function isCacheableResponse(response: Response): boolean {
  return CACHEABLE_STATUSES.has(response.status) && !response.headers.has('set-cookie')
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
 * The key covers everything a response varies on: the Worker version, the host (staging and
 * production differ), the path and query, and for RSC requests the router headers.
 */
export async function cacheKeyFor(request: Request, deploymentId: string): Promise<Request> {
  const url = new URL(request.url)
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
 * Answers `request` from the cache when it can, otherwise from `render`, storing a cacheable
 * response in the background. Every response carries `x-edge-cache: HIT`, `MISS` or `BYPASS`.
 */
export async function withEdgeCache(
  request: Request,
  context: EdgeCacheContext,
  options: EdgeCacheOptions,
  render: (request: Request) => Promise<Response>
): Promise<Response> {
  if (!isCacheableRequest(request) || !options.deploymentId) {
    return withState(await render(request), 'BYPASS')
  }

  const key = await cacheKeyFor(request, options.deploymentId)
  const cached = await options.cache.match(key).catch(() => undefined)
  if (cached) return servedCopy(cached, request.method)

  const response = await render(renderRequestFor(request))
  if (request.method === 'GET' && isCacheableResponse(response)) {
    const stored = storedCopy(response.clone(), options.ttlSeconds ?? EDGE_CACHE_TTL_SECONDS)
    context.waitUntil(options.cache.put(key, stored).catch(() => undefined))
  }
  return withState(response, 'MISS')
}

/** `worker.ts`'s entry point: the named cache and the Worker version from the bindings. */
export async function serveWithEdgeCache(
  request: Request,
  env: EdgeCacheEnvironment,
  context: EdgeCacheContext,
  render: (request: Request) => Promise<Response>
): Promise<Response> {
  return withEdgeCache(
    request,
    context,
    { cache: await caches.open(EDGE_CACHE_NAME), deploymentId: env.CF_VERSION_METADATA?.id },
    render
  )
}
