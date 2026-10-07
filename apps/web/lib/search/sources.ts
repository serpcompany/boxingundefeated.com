/**
 * Where the search page gets results: `GET /api/search?q=` (lib/worker/search-api.ts), backed by
 * D1.
 */
import { SEARCH_API_PATH, type SearchResponse } from './contract'

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

export const searchApi: SearchSource = async (query, signal) => {
  const response = await fetch(`${SEARCH_API_PATH}?q=${encodeURIComponent(query)}`, {
    headers: { accept: 'application/json' },
    signal
  })
  if (!response.ok) throw new SearchUnavailableError(response.status)
  return (await response.json()) as SearchResponse
}
