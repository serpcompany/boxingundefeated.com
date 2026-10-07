/**
 * `GET /api/search?q=`: boxer search on D1, answered by the Worker itself, before OpenNext
 * (lib/worker/handle-request.ts). The search page calls it (lib/search/).
 *
 * - Paths: `/api/search` and `/api/search/` both answer 200, never a redirect (SERP URL standard:
 *   `/api` paths are served exactly as requested). Other `/api` paths fall through to OpenNext.
 * - Input: `q` longer than `SEARCH_QUERY_MAX_LENGTH` is a 400. The query is reduced to at most
 *   `SEARCH_MAX_TERMS` letter-and-digit terms (`searchTerms`), bound as values of `instr()`
 *   substring tests, and at most `SEARCH_RESULT_LIMIT` boxers come back. A failed search is a
 *   generic 500 JSON; the log gets the root cause only (`errorSummary`), never SQL or the query.
 * - Readiness: the import marker (lib/worker/dataset-gate.ts). Until a first import finishes, or
 *   while D1 is unreadable, a 503 with `Retry-After`, never an empty result.
 * - Edge cache: per data center, keyed by the Worker version, the import generation (as pages are,
 *   lib/worker/dataset-gate.ts), the host and the normalized query, so `Ali`, ` ali ` and
 *   `ali&utm_source=x` share one entry and a key never holds more than the terms. Only a 200 is
 *   stored, and nothing during a re-import.
 *
 * No Next.js imports: this runs before OpenNext loads, and every dependency is injected.
 */
import {
  type BoxerSearch,
  type BoxerSearchResult,
  createDatabase,
  SEARCH_QUERY_MAX_LENGTH,
  searchBoxers,
  searchTerms
} from '@boxingundefeated/data-ops'
import type { SearchErrorResponse, SearchResponse } from '../search/contract'
import { DATASET_RETRY_AFTER_SECONDS, type DatasetReadiness } from './dataset-gate'
import { EDGE_CACHE_HEADER, EDGE_CACHE_TTL_SECONDS, type EdgeCacheRuntime } from './edge-cache'

export const SEARCH_API_PATHS: ReadonlySet<string> = new Set(['/api/search', '/api/search/'])
/** What a browser may reuse a search for. The edge copy lives `EDGE_CACHE_TTL_SECONDS`. */
export const SEARCH_BROWSER_MAX_AGE_SECONDS = 60

const CACHE_KEY_ORIGIN = 'https://edge-cache.invalid'

export function isSearchApiRequest(request: Request): boolean {
  return SEARCH_API_PATHS.has(new URL(request.url).pathname)
}

export interface SearchApiEvent {
  event: 'search_api'
  state: 'HIT' | 'MISS' | 'BYPASS'
  status: number
  terms: number
  stored?: boolean
  error?: string
}

export interface SearchApiOptions {
  /** Runs the search (`searchBoxers` on D1). Only called for a non-empty, ready query. */
  search: (query: string) => Promise<BoxerSearch>
  /** Whether D1 holds a finished import (`DatasetReadinessMemo.current`). */
  readiness: () => Promise<DatasetReadiness>
  /** The Cache API and execution context. Without it, or without a deployment id, no caching. */
  edgeCache?: EdgeCacheRuntime
  /** The Worker version (`CF_VERSION_METADATA.id`). */
  deploymentId?: string
  ttlSeconds?: number
  observe?: (event: SearchApiEvent | { event: 'dataset_unavailable'; reason: string }) => void
}

function json(
  request: Request,
  body: SearchResponse | SearchErrorResponse,
  status: number,
  headers: Record<string, string> = {}
): Response {
  return new Response(request.method === 'HEAD' ? null : JSON.stringify(body), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control':
        status === 200 ? `public, max-age=${SEARCH_BROWSER_MAX_AGE_SECONDS}` : 'no-store',
      // Results are for the search page, not for search engines.
      'x-robots-tag': 'noindex',
      ...headers
    }
  })
}

export function toSearchResponse(search: BoxerSearch): SearchResponse {
  return {
    query: search.query,
    results: search.results.map((boxer: BoxerSearchResult) => ({
      slug: boxer.slug,
      name: boxer.name,
      nicknames: boxer.nicknames,
      nationality: boxer.nationality,
      division: boxer.proDivision,
      wins: boxer.proWins,
      losses: boxer.proLosses,
      draws: boxer.proDraws
    })),
    truncated: search.truncated
  }
}

/** The edge cache key: everything a search response varies on, and nothing a visitor adds. */
export function searchCacheKey(
  request: Request,
  deploymentId: string,
  dataGeneration: string,
  query: string
): Request {
  const { host } = new URL(request.url)
  const key = [CACHE_KEY_ORIGIN, deploymentId, dataGeneration, 'api-search', host]
    .map((part, index) => (index === 0 ? part : encodeURIComponent(part)))
    .join('/')
  return new Request(`${key}?q=${encodeURIComponent(query)}`, { method: 'GET' })
}

/** The longest error summary a log line carries. */
const ERROR_SUMMARY_LENGTH = 200

/**
 * The root cause of a failed search, for the log: its name and message, capped. Never the SQL or
 * the visitor's terms: Drizzle's `DrizzleQueryError` message is `Failed query: <sql>\nparams:
 * <params>`, so it is replaced by its cause (D1's error, such as `D1_ERROR: no such table`).
 */
export function errorSummary(error: unknown): string {
  let root = error
  while (root instanceof Error && root.cause instanceof Error) root = root.cause
  if (!(root instanceof Error)) return 'unknown error'
  if (root.name === 'DrizzleQueryError' || root.message.startsWith('Failed query:')) {
    return root.name
  }
  return `${root.name}: ${root.message}`.slice(0, ERROR_SUMMARY_LENGTH)
}

export async function handleSearchApi(
  request: Request,
  options: SearchApiOptions
): Promise<Response> {
  const observe = options.observe ?? (() => {})
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    return json(request, { error: 'Use GET.' }, 405, { allow: 'GET, HEAD' })
  }
  const q = new URL(request.url).searchParams.get('q') ?? ''
  if (q.length > SEARCH_QUERY_MAX_LENGTH) {
    return json(request, { error: `q is longer than ${SEARCH_QUERY_MAX_LENGTH} characters.` }, 400)
  }

  const readiness = await options.readiness()
  if (!readiness.ready) {
    observe({ event: 'dataset_unavailable', reason: readiness.reason })
    return json(
      request,
      { error: 'Boxer data is being updated. Please try again in a few minutes.' },
      503,
      { 'retry-after': String(DATASET_RETRY_AFTER_SECONDS) }
    )
  }

  const terms = searchTerms(q)
  if (terms.length === 0) {
    return json(request, { query: '', results: [], truncated: false }, 200)
  }
  const query = terms.join(' ')

  const { edgeCache, deploymentId } = options
  const cache =
    edgeCache && deploymentId
      ? {
          runtime: edgeCache,
          store: await edgeCache.openCache(),
          key: searchCacheKey(request, deploymentId, readiness.generation, query)
        }
      : undefined
  const cached = cache && (await cache.store.match(cache.key).catch(() => undefined))
  if (cached) {
    observe({ event: 'search_api', state: 'HIT', status: 200, terms: terms.length })
    const headers = new Headers(cached.headers)
    headers.set('cache-control', `public, max-age=${SEARCH_BROWSER_MAX_AGE_SECONDS}`)
    headers.set(EDGE_CACHE_HEADER, 'HIT')
    return new Response(request.method === 'HEAD' ? null : cached.body, { status: 200, headers })
  }

  let body: SearchResponse
  try {
    body = toSearchResponse(await options.search(query))
  } catch (error) {
    observe({
      event: 'search_api',
      state: 'BYPASS',
      status: 500,
      terms: terms.length,
      error: errorSummary(error)
    })
    return json(request, { error: 'Search failed. Please try again.' }, 500)
  }

  const response = json(request, body, 200, cache ? { [EDGE_CACHE_HEADER]: 'MISS' } : {})
  // Not during a re-import: the result may mix the old and the new data.
  const stored = Boolean(cache && !readiness.importing && request.method === 'GET')
  if (cache && stored) {
    const ttl = options.ttlSeconds ?? EDGE_CACHE_TTL_SECONDS
    const headers = new Headers(response.headers)
    headers.set('cache-control', `public, max-age=${ttl}`)
    headers.delete(EDGE_CACHE_HEADER)
    const copy = new Response(JSON.stringify(body), { status: 200, headers })
    cache.runtime.context.waitUntil(cache.store.put(cache.key, copy).catch(() => undefined))
  }
  observe({
    event: 'search_api',
    state: cache ? 'MISS' : 'BYPASS',
    status: 200,
    terms: terms.length,
    stored
  })
  return response
}

/** The Worker entry's handler: `searchBoxers` on the `DB` binding. */
export function d1SearchApi(
  env: { DB?: D1Database; CF_VERSION_METADATA?: { id?: string } },
  runtime: Omit<SearchApiOptions, 'search' | 'deploymentId'>
): (request: Request) => Promise<Response> {
  return request =>
    handleSearchApi(request, {
      ...runtime,
      deploymentId: env.CF_VERSION_METADATA?.id,
      search: async query => {
        if (!env.DB) throw new Error('the DB binding is missing')
        return searchBoxers(createDatabase(env.DB), query)
      }
    })
}
