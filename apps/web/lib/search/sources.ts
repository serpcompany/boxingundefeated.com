/**
 * Where the search page gets results, by build target (`SITE_BUILD_OUTPUT`, which next.config.ts
 * inlines into client bundles too):
 *
 * - `worker`: `GET /api/search?q=` (lib/worker/search-api.ts), backed by D1.
 * - `export`, the static export GitHub Pages serves until the cutover (#19): today's committed
 *   index, `/search/boxer-search-index.json`, matched in the browser exactly as before. #20 deletes
 *   it, its generator and this branch.
 */
import { SEARCH_API_PATH, type SearchResponse, type SearchResult } from './contract'

export type SearchSource = (query: string, signal: AbortSignal) => Promise<SearchResponse>

export class SearchUnavailableError extends Error {
  override name = 'SearchUnavailableError'

  constructor(readonly status: number) {
    super(
      status === 503
        ? 'Boxer data is being updated. Please try again in a few minutes.'
        : 'Search is unavailable right now. Please try again.'
    )
  }
}

export function searchesApi(): boolean {
  return process.env.SITE_BUILD_OUTPUT === 'worker'
}

export const searchApi: SearchSource = async (query, signal) => {
  const response = await fetch(`${SEARCH_API_PATH}?q=${encodeURIComponent(query)}`, {
    headers: { accept: 'application/json' },
    signal
  })
  if (!response.ok) throw new SearchUnavailableError(response.status)
  return (await response.json()) as SearchResponse
}

/** An entry of `/search/boxer-search-index.json` (apps/web/scripts/generate-boxer-search.ts). */
interface StaticIndexEntry {
  name: string
  slug: string
  nationality?: string
  division?: string
  wins?: number
  losses?: number
  draws?: number
}

export const STATIC_INDEX_PATH = '/search/boxer-search-index.json'
/** Today's limit on the static search. */
const STATIC_RESULT_LIMIT = 50

let staticIndex: Promise<StaticIndexEntry[]> | undefined

/** Loads the static index once per page; a failed load is retried by the next search. */
export function loadStaticIndex(): Promise<StaticIndexEntry[]> {
  staticIndex ??= fetch(STATIC_INDEX_PATH)
    .then(async response => {
      if (!response.ok) throw new SearchUnavailableError(response.status)
      return (await response.json()) as StaticIndexEntry[]
    })
    .catch((error: unknown) => {
      staticIndex = undefined
      throw error
    })
  return staticIndex
}

function toResult(entry: StaticIndexEntry): SearchResult {
  return {
    slug: entry.slug,
    name: entry.name,
    nicknames: null,
    nationality: entry.nationality ?? null,
    division: entry.division ?? null,
    wins: entry.wins ?? 0,
    losses: entry.losses ?? 0,
    draws: entry.draws ?? 0
  }
}

/** Today's static search: a substring of the name, nationality or division, in index order. */
export function matchStaticIndex(
  entries: readonly StaticIndexEntry[],
  query: string
): SearchResponse {
  const needle = query.toLowerCase()
  const matches = entries.filter(
    entry =>
      entry.name.toLowerCase().includes(needle) ||
      entry.nationality?.toLowerCase().includes(needle) ||
      entry.division?.toLowerCase().includes(needle)
  )
  return {
    query,
    results: matches.slice(0, STATIC_RESULT_LIMIT).map(toResult),
    truncated: matches.length > STATIC_RESULT_LIMIT
  }
}

export const searchStaticIndex: SearchSource = async query =>
  matchStaticIndex(await loadStaticIndex(), query)
