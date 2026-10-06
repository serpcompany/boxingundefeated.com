import { createHash } from 'node:crypto'
import type { ImportDataset } from './dataset'
import { BOUT_COLUMNS, BOXER_COLUMNS, DIVISION_COLUMNS, type Row } from './rows'

export type TableChecksums = Record<'divisions' | 'boxers' | 'bouts', string>

/** SHA-256 of one JSON array per row, in the given column order. Pass rows in key order. */
export function rowsChecksum(columns: readonly string[], rows: Iterable<Row>): string {
  const hash = createHash('sha256')
  for (const row of rows) hash.update(`${JSON.stringify(columns.map(c => row[c] ?? null))}\n`)
  return hash.digest('hex')
}

/**
 * The content checksum of what an import should leave in D1: every column except the
 * database-assigned `boxers.imported_at` and `bouts.id`, so it is comparable across targets.
 */
export function expectedChecksums(dataset: ImportDataset): TableChecksums {
  return {
    divisions: rowsChecksum(DIVISION_COLUMNS, dataset.divisions),
    boxers: rowsChecksum(BOXER_COLUMNS, dataset.boxers),
    bouts: rowsChecksum(BOUT_COLUMNS, dataset.bouts)
  }
}
