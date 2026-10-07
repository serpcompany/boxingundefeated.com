/**
 * What `GET /api/search?q=` answers (lib/worker/search-api.ts) and what the search page renders.
 * Client-safe: no server or Worker imports.
 */

export const SEARCH_API_PATH = '/api/search'

/** One boxer in the result list: the fields a result card shows, and its profile slug. */
export interface SearchResult {
  slug: string
  name: string
  /** As the source has it, quotes included: `"Money,Pretty Boy"`. */
  nicknames: string | null
  nationality: string | null
  /** The pro division as boxers carry it, such as `light heavy`. */
  division: string | null
  wins: number
  losses: number
  draws: number
}

export interface SearchResponse {
  /** The normalized query that was searched for (its terms, joined by spaces). */
  query: string
  /** Best match first. */
  results: SearchResult[]
  /** More boxers match than `results` holds. */
  truncated: boolean
}

/** The body of a 400, 405, 500 or 503 from the search API. */
export interface SearchErrorResponse {
  error: string
}

/** The profile a result links to: the same URL the search page has always linked. */
export function searchResultHref(result: Pick<SearchResult, 'slug'>): string {
  return `/boxers/${result.slug}/`
}
