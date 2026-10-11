import { sqlLiteral } from './sql'

/**
 * The first thing an import runs: mark `dataset_state` as importing. A first import leaves
 * `version` null, so the Worker keeps answering 503 until it finishes; a re-import keeps the last
 * complete version, so pages stay up but nothing new is edge-cached until it finishes.
 */
export function buildImportStart(): string {
  return (
    'INSERT INTO dataset_state (id, importing) VALUES (1, 1)\n' +
    'ON CONFLICT (id) DO UPDATE SET importing = 1;\n'
  )
}

/**
 * When an import finishes, to the millisecond. Every finished import records a new one, a re-import
 * of the same data included.
 */
const FINISHED_AT = "strftime('%Y-%m-%d %H:%M:%f', 'now')"

/**
 * The very last thing an import runs, once the row counts check out: record the version, clear
 * `importing`, and stamp `completed_at`. The version stays the same when the data does, but
 * `completed_at` changes with every finished import: with the version, it is the import generation
 * that keys the Worker's edge cache (`apps/web/lib/worker/dataset-gate.ts`), so a page cached while
 * this import ran is never served once it has finished, even if it changed no data.
 */
export function buildImportComplete(version: string): string {
  const value = sqlLiteral(version)
  return (
    `INSERT INTO dataset_state (id, version, importing, completed_at) VALUES (1, ${value}, 0, ${FINISHED_AT})\n` +
    'ON CONFLICT (id) DO UPDATE SET importing = 0, version = excluded.version,\n' +
    '  completed_at = excluded.completed_at;\n'
  )
}

/**
 * Whether a D1 has `dataset_state` yet, without failing on one that lacks it: one row, `tables`, 0
 * or 1. Migration 0001 creates the table, and an import's first statement needs it, so a D1
 * without it has never started an import. Read-only, like `DATASET_STATE_QUERY`; D1 documents
 * reading `sqlite_schema`.
 */
export const DATASET_STATE_TABLE_QUERY =
  "SELECT count(*) AS tables FROM sqlite_schema WHERE type = 'table' AND name = 'dataset_state'"

/** `dataset_state`'s one row: none until the first import starts. */
export const DATASET_STATE_QUERY = 'SELECT version, importing FROM dataset_state WHERE id = 1'

export interface DatasetStateRow {
  version: string | null
  importing: unknown
}

/**
 * Why an import may be writing to a D1 now, from the rows of `DATASET_STATE_QUERY`; undefined when
 * none is. The flag can't tell a running import from one that stopped before it finished, so
 * both count until an import finishes. It fails closed: any `importing` but 0 or false counts.
 */
export function importInProgress(rows: readonly DatasetStateRow[]): string | undefined {
  const [state] = rows
  if (!state || state.importing === 0 || state.importing === false) return undefined
  const last = state.version
    ? `the last finished import is ${state.version}`
    : 'no import has finished yet'
  return `dataset_state says an import is in progress, or stopped before it finished (${last})`
}
