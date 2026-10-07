/**
 * The D1 readiness gate, step 3 of lib/worker/handle-request.ts, for pages that read D1 at request
 * time. A D1 that is not migrated, empty, or in its first import would otherwise answer every
 * profile with a 404 or a page missing its bouts, and every listing with missing boxers, and the
 * edge cache could keep that for an hour.
 *
 * The importer brackets its writes in `dataset_state` (packages/data-ops/src/import/state.ts):
 * - no finished import (no table, no row, no version) or an unreadable D1: 503 with `Retry-After`
 *   and `Cache-Control: no-store`, never a 404, and never stored;
 * - a re-import in progress: pages are served, cached copies of the last complete import too,
 *   but nothing new is stored, since a page rendered now may be half old, half new;
 * - a finished import: pages are cached under its generation (`importGeneration`), so the next
 *   import takes effect without a purge. Every finished import is a new generation, even one that
 *   changed no data, so any re-import, of the same data too, empties the whole page cache.
 * - an unreadable D1 after a finished import: copies cached under the last generation this isolate
 *   read are still served (`lastGeneration`), with `x-edge-cache: HIT`, for as long as each copy
 *   lasts (`EDGE_CACHE_TTL_SECONDS`); a page without one is a 503. Each request still logs
 *   `dataset_unavailable`, so that log counts stale hits as well as 503s.
 *
 * Each isolate reads `dataset_state` (one row, by primary key) at most once per
 * `DATASET_STATE_TTL_MS`, so a cached page normally costs no D1 query. For that long after an
 * import starts, an isolate can still believe no import is running and cache a page rendered from
 * half-imported data. That page is stored under the generation from before the import, which every
 * isolate has left behind within `DATASET_STATE_TTL_MS` of the import finishing, so it is never
 * served after that, even when the import left the data, and so the version, unchanged. The one
 * exception is an isolate that never read the new generation before D1 became unreadable: it
 * serves its last generation's copies, that page included, until D1 answers again.
 */
import { createDatabase, getDatasetState } from '@boxingundefeated/data-ops'

/**
 * Pages whose content comes from D1 at request time: the homepage, `/boxers/` with its pages and
 * the profiles, `/divisions/` with each division and its pages, and the HTML sitemap.
 */
export const D1_PAGE_PATTERNS: readonly RegExp[] = [
  /^\/$/,
  /^\/boxers\/(?:page\/[^/]+\/|[^/]+\/)?$/,
  /^\/divisions\/(?:[^/]+\/(?:page\/[^/]+\/)?)?$/,
  /^\/sitemap\/$/
]
export const DATASET_STATE_TTL_MS = 30_000
/** How long an unreadable `dataset_state` is remembered before the next read. */
export const DATASET_ERROR_TTL_MS = 5_000
export const DATASET_RETRY_AFTER_SECONDS = 120

export interface DatasetState {
  version: string | null
  importing: boolean
  /** When the last import finished; every finished import sets a new one. */
  completedAt?: string | null
}

export type DatasetReadiness =
  | { ready: true; version: string; generation: string; importing: boolean }
  | {
      ready: false
      reason: string
      /**
       * When `dataset_state` is unreadable: the generation this isolate last read from a finished
       * import, whose cached pages may still be served.
       */
      lastGeneration?: string
    }

export function readsD1(request: Request): boolean {
  const { pathname } = new URL(request.url)
  return D1_PAGE_PATTERNS.some(pattern => pattern.test(pathname))
}

/**
 * What D1 pages are cached under: the last finished import's version (its content checksum) and
 * when it finished. The version alone stays the same when an import changes no data; the finish
 * time changes with every import, so a page cached during one is never served after it.
 */
export function importGeneration(version: string, completedAt: string | null | undefined): string {
  return completedAt ? `${version}@${completedAt}` : version
}

export function readinessOf(state: DatasetState | null): DatasetReadiness {
  if (!state) return { ready: false, reason: 'no import has started' }
  if (!state.version) return { ready: false, reason: 'the first import has not finished' }
  return {
    ready: true,
    version: state.version,
    generation: importGeneration(state.version, state.completedAt),
    importing: state.importing
  }
}

/** The answer for a D1 page while D1 can't serve it. */
export function datasetUnavailable(request: Request): Response {
  const body = 'Boxer data is being updated. Please try again in a few minutes.\n'
  return new Response(request.method === 'HEAD' ? null : body, {
    status: 503,
    headers: {
      'cache-control': 'no-store',
      'content-type': 'text/plain; charset=utf-8',
      'retry-after': String(DATASET_RETRY_AFTER_SECONDS)
    }
  })
}

/** Per-isolate memo of the readiness; concurrent reads share one load. */
export class DatasetReadinessMemo {
  private inflight: Promise<DatasetReadiness> | undefined
  private value: { readiness: DatasetReadiness; expiresAt: number } | undefined
  private lastGeneration: string | undefined

  constructor(
    private readonly load: () => Promise<DatasetState | null>,
    private readonly now: () => number = Date.now
  ) {}

  current(): Promise<DatasetReadiness> {
    if (this.value && this.now() < this.value.expiresAt) {
      return Promise.resolve(this.value.readiness)
    }
    this.inflight ||= this.load()
      .then(state => ({ readiness: readinessOf(state), ttl: DATASET_STATE_TTL_MS }))
      .catch((error: unknown) => ({
        readiness: {
          ready: false as const,
          reason: `dataset_state is unreadable: ${error instanceof Error ? error.message : String(error)}`,
          ...(this.lastGeneration ? { lastGeneration: this.lastGeneration } : {})
        },
        ttl: DATASET_ERROR_TTL_MS
      }))
      .then(({ readiness, ttl }) => {
        this.value = { readiness, expiresAt: this.now() + ttl }
        if (readiness.ready) this.lastGeneration = readiness.generation
        else if (!readiness.lastGeneration) this.lastGeneration = undefined
        return readiness
      })
      .finally(() => {
        this.inflight = undefined
      })
    return this.inflight
  }
}

/** The memo the Worker entry keeps per isolate, reading the `DB` binding through data-ops. */
export function d1DatasetReadiness(env: { DB?: D1Database }): DatasetReadinessMemo {
  return new DatasetReadinessMemo(async () => {
    if (!env.DB) throw new Error('the DB binding is missing')
    return getDatasetState(createDatabase(env.DB))
  })
}
