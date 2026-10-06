/**
 * The XML sitemaps (lib/sitemaps/sitemaps.ts), answered by the Worker itself, before OpenNext
 * (lib/worker/handle-request.ts), like `/api/search`: they read D1 on request, which a Next.js
 * route handler in the static export (kept for CI's link check until #20) can't.
 *
 * - `/sitemap-index.xml` and `/sitemap-<group>[-<n>].xml`: generated from D1 (`getSitemapData`)
 *   and the build's content entries, with the environment's origin (lib/site-config.ts): local
 *   output lists local URLs, staging lists staging URLs. A name the index doesn't list is a 404.
 * - Old URLs: `/sitemap.xml` (the compatibility alias) and the nested `/sitemaps/<group>/<n>.xml`
 *   files the static export published, with or without a trailing slash, answer one 308 to
 *   `/sitemap-index.xml` (on `www` and `*.workers.dev`, the canonical-host redirect does it).
 * - A name that is neither the index nor a group's file is a 404 before any D1 read.
 * - Crawl policy: robots.txt lists the index in production only. Outside production, robots.txt
 *   disallows everything and these files carry `X-Robots-Tag: noindex` like every other response
 *   (lib/worker/environment-policy.ts, which wraps this handler).
 * - Readiness: the import marker (lib/worker/dataset-gate.ts). Until a first import finishes, or
 *   while D1 is unreadable, a 503 with `Retry-After`, never a sitemap without boxers.
 * - Edge cache: per data center, keyed by the Worker version, the import generation, the host and
 *   the path, for `EDGE_CACHE_TTL_SECONDS`, as pages are. A deploy or a finished import takes
 *   effect without a purge; nothing is stored during a re-import.
 *
 * No Next.js imports: this runs before OpenNext loads, and every dependency is injected.
 */
import { createDatabase, getSitemapData, type SitemapData } from '@boxingundefeated/data-ops'
import { parseSiteEnvironment, siteOriginFor } from '../site-config'
import {
  isKnownSitemapPath,
  isLegacySitemapPath,
  renderSitemapFile,
  SITEMAP_INDEX_PATH,
  type SitemapContent
} from '../sitemaps/sitemaps'
import { DATASET_RETRY_AFTER_SECONDS, type DatasetReadiness } from './dataset-gate'
import { EDGE_CACHE_HEADER, EDGE_CACHE_TTL_SECONDS, type EdgeCacheRuntime } from './edge-cache'
import { errorSummary } from './search-api'

/**
 * Root files named `sitemap-<name>.xml`: the index, the child sitemaps, and unknown names, which
 * are answered 404 here before any D1 read.
 */
const SITEMAP_FILE = /^\/sitemap-[a-z0-9-]+\.xml$/

/** What a client may reuse a sitemap for; the edge copy lives `EDGE_CACHE_TTL_SECONDS`. */
export const SITEMAP_BROWSER_MAX_AGE_SECONDS = 60 * 60

const CACHE_KEY_ORIGIN = 'https://edge-cache.invalid'

export function isSitemapRequest(request: Request): boolean {
  const { pathname } = new URL(request.url)
  return SITEMAP_FILE.test(pathname) || isLegacySitemapPath(pathname)
}

export interface SitemapEvent {
  event: 'sitemap'
  path: string
  state: 'HIT' | 'MISS' | 'BYPASS'
  status: number
  stored?: boolean
  error?: string
}

export interface SitemapOptions {
  /** Reads what the sitemaps list from D1. Only called when D1 is ready and the cache misses. */
  load: () => Promise<SitemapData>
  /** The build's content entries (`.open-next/sitemap-content.json`). */
  content: SitemapContent
  /** Whether D1 holds a finished import (`DatasetReadinessMemo.current`). */
  readiness: () => Promise<DatasetReadiness>
  /** The runtime `SITE_ENVIRONMENT`, which sets the origin of every URL. */
  siteEnvironment?: string
  /** The Cache API and execution context. Without it, or without a deployment id, no caching. */
  edgeCache?: EdgeCacheRuntime
  /** The Worker version (`CF_VERSION_METADATA.id`). */
  deploymentId?: string
  ttlSeconds?: number
  /** Overrides `MAX_URLS_PER_SITEMAP`, for tests. */
  maxUrls?: number
  observe?: (event: SitemapEvent | { event: 'dataset_unavailable'; reason: string }) => void
}

function text(request: Request, body: string, status: number, headers: Record<string, string>) {
  return new Response(request.method === 'HEAD' ? null : body, {
    status,
    headers: { 'content-type': 'text/plain; charset=utf-8', ...headers }
  })
}

function xmlHeaders(): Headers {
  return new Headers({
    'content-type': 'application/xml; charset=utf-8',
    'cache-control': `public, max-age=${SITEMAP_BROWSER_MAX_AGE_SECONDS}`
  })
}

export function sitemapCacheKey(
  request: Request,
  deploymentId: string,
  dataGeneration: string
): Request {
  const { host, pathname } = new URL(request.url)
  const key = [CACHE_KEY_ORIGIN, deploymentId, dataGeneration, 'sitemap', host]
    .map((part, index) => (index === 0 ? part : encodeURIComponent(part)))
    .join('/')
  return new Request(`${key}${pathname}`, { method: 'GET' })
}

export async function handleSitemapRequest(
  request: Request,
  options: SitemapOptions
): Promise<Response> {
  const observe = options.observe ?? (() => {})
  const url = new URL(request.url)
  const path = url.pathname
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    return text(request, 'Use GET.\n', 405, { allow: 'GET, HEAD', 'cache-control': 'no-store' })
  }
  if (isLegacySitemapPath(path)) {
    return new Response(null, {
      status: 308,
      headers: { location: new URL(SITEMAP_INDEX_PATH, url).href }
    })
  }
  if (!isKnownSitemapPath(path)) {
    observe({ event: 'sitemap', path, state: 'BYPASS', status: 404 })
    return text(request, 'Not found.\n', 404, { 'cache-control': 'no-store' })
  }

  const readiness = await options.readiness()
  if (!readiness.ready) {
    observe({ event: 'dataset_unavailable', reason: readiness.reason })
    return text(request, 'Boxer data is being updated. Please try again in a few minutes.\n', 503, {
      'cache-control': 'no-store',
      'retry-after': String(DATASET_RETRY_AFTER_SECONDS)
    })
  }

  const { edgeCache, deploymentId } = options
  const cache =
    edgeCache && deploymentId
      ? {
          runtime: edgeCache,
          store: await edgeCache.openCache(),
          key: sitemapCacheKey(request, deploymentId, readiness.generation)
        }
      : undefined
  const cached = cache && (await cache.store.match(cache.key).catch(() => undefined))
  if (cached) {
    observe({ event: 'sitemap', path, state: 'HIT', status: 200 })
    const headers = xmlHeaders()
    headers.set(EDGE_CACHE_HEADER, 'HIT')
    return new Response(request.method === 'HEAD' ? null : cached.body, { status: 200, headers })
  }

  const environment = parseSiteEnvironment(options.siteEnvironment) ?? 'local'
  let xml: string | null
  try {
    xml = renderSitemapFile(
      path,
      siteOriginFor(environment),
      await options.load(),
      options.content,
      options.maxUrls
    )
  } catch (error) {
    observe({ event: 'sitemap', path, state: 'BYPASS', status: 503, error: errorSummary(error) })
    return text(request, 'The sitemap is unavailable. Please try again in a few minutes.\n', 503, {
      'cache-control': 'no-store',
      'retry-after': String(DATASET_RETRY_AFTER_SECONDS)
    })
  }
  if (xml === null) {
    observe({ event: 'sitemap', path, state: 'BYPASS', status: 404 })
    return text(request, 'Not found.\n', 404, { 'cache-control': 'no-store' })
  }

  const headers = xmlHeaders()
  // Not during a re-import: the file may mix the old and the new data.
  const stored = Boolean(cache && !readiness.importing && request.method === 'GET')
  if (cache && stored) {
    const copy = new Response(xml, {
      status: 200,
      headers: {
        'content-type': 'application/xml; charset=utf-8',
        'cache-control': `public, max-age=${options.ttlSeconds ?? EDGE_CACHE_TTL_SECONDS}`
      }
    })
    cache.runtime.context.waitUntil(cache.store.put(cache.key, copy).catch(() => undefined))
  }
  if (cache) headers.set(EDGE_CACHE_HEADER, 'MISS')
  observe({ event: 'sitemap', path, state: cache ? 'MISS' : 'BYPASS', status: 200, stored })
  return new Response(request.method === 'HEAD' ? null : xml, { status: 200, headers })
}

/** The Worker entry's handler: `getSitemapData` on the `DB` binding. */
export function d1Sitemaps(
  env: { DB?: D1Database; CF_VERSION_METADATA?: { id?: string }; SITE_ENVIRONMENT?: string },
  runtime: Omit<SitemapOptions, 'load' | 'deploymentId' | 'siteEnvironment'>
): (request: Request) => Promise<Response> {
  return request =>
    handleSitemapRequest(request, {
      ...runtime,
      deploymentId: env.CF_VERSION_METADATA?.id,
      siteEnvironment: env.SITE_ENVIRONMENT,
      load: async () => {
        if (!env.DB) throw new Error('the DB binding is missing')
        return getSitemapData(createDatabase(env.DB))
      }
    })
}
