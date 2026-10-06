import type { ImportDataset } from './dataset'
import { BOUT_COLUMNS, BOXER_COLUMNS, DIVISION_COLUMNS, type Row, type SqlValue } from './rows'

/** D1's limit on one SQL statement (https://developers.cloudflare.com/d1/platform/limits/). */
export const D1_MAX_STATEMENT_BYTES = 100_000
export const DEFAULT_MAX_STATEMENT_BYTES = 90_000
/** Each file is one `wrangler d1 execute --file` call: one transaction, rolled back on failure. */
export const DEFAULT_MAX_FILE_BYTES = 4_000_000

export interface SqlLimits {
  maxStatementBytes?: number
  maxFileBytes?: number
}

export interface SqlFile {
  name: string
  sql: string
  statements: number
  bytes: number
}

const encoder = new TextEncoder()
export const byteLength = (text: string): number => encoder.encode(text).length

export function sqlLiteral(value: SqlValue): string {
  if (value === null) return 'NULL'
  if (typeof value === 'number') {
    if (!Number.isSafeInteger(value)) throw new Error(`Only integers are imported, got ${value}`)
    return String(value)
  }
  return `'${value.replaceAll("'", "''")}'`
}

interface UpsertSpec {
  table: string
  columns: readonly string[]
  /** The unique key the upsert matches on. */
  conflict: readonly string[]
  /** Columns the source never changes on an existing row (the key, the primary key). */
  keep?: readonly string[]
  /** Extra assignments when a row changes, such as a timestamp. */
  touch?: string
  /**
   * Leave rows that already match out of the `INSERT` itself. Needed for an `AUTOINCREMENT`
   * table: SQLite allocates a rowid for every row an `INSERT` attempts, even one the upsert then
   * skips, so each statement would rewrite `sqlite_sequence` (one row written per statement on
   * D1) and advance the counter by its row count on every re-run.
   */
  skipUnchanged?: boolean
}

const updatedColumns = ({ columns, conflict, keep = [] }: UpsertSpec) =>
  columns.filter(column => !conflict.includes(column) && !keep.includes(column))

function upsertPrefix(spec: UpsertSpec): string {
  const columns = spec.columns.join(', ')
  return spec.skipUnchanged
    ? `WITH incoming (${columns}) AS (VALUES\n`
    : `INSERT INTO ${spec.table} (${columns}) VALUES\n`
}

/**
 * `INSERT … ON CONFLICT DO UPDATE … WHERE <a column differs>`: a row that already matches is
 * not written at all, so re-running an import writes nothing. Not `INSERT OR REPLACE`, which
 * deletes the row and so cascades to its bouts and unlinks opponents. With `skipUnchanged`, the
 * rows come from a `WITH incoming (…) AS (VALUES …)` and only those that differ are inserted.
 */
function upsertSuffix(spec: UpsertSpec): string {
  const { table, columns, conflict, touch } = spec
  const updated = updatedColumns(spec)
  const assignments = updated.map(column => `${column} = excluded.${column}`)
  if (touch) assignments.push(touch)
  const changed = updated.map(column => `${table}.${column} IS NOT excluded.${column}`)
  const select = spec.skipUnchanged
    ? `)\nINSERT INTO ${table} (${columns.join(', ')})\nSELECT * FROM incoming WHERE NOT EXISTS ` +
      `(SELECT 1 FROM ${table} AS stored WHERE ${[
        ...conflict.map(column => `stored.${column} = incoming.${column}`),
        ...updated.map(column => `stored.${column} IS incoming.${column}`)
      ].join(' AND ')})`
    : ''
  return (
    `${select}\nON CONFLICT (${conflict.join(', ')}) DO UPDATE SET ${assignments.join(', ')}` +
    `\nWHERE ${changed.join(' OR ')};\n`
  )
}

/** Multi-row upserts, each statement as many rows as fit under `maxStatementBytes`. */
export function buildUpserts(
  spec: UpsertSpec,
  rows: readonly Row[],
  maxStatementBytes = DEFAULT_MAX_STATEMENT_BYTES
): string[] {
  const prefix = upsertPrefix(spec)
  const suffix = upsertSuffix(spec)
  const fixed = byteLength(prefix) + byteLength(suffix)
  const statements: string[] = []
  let tuples: string[] = []
  let size = fixed
  for (const row of rows) {
    const tuple = `(${spec.columns.map(column => sqlLiteral(row[column] ?? null)).join(', ')})`
    const tupleBytes = byteLength(tuple) + 2
    if (fixed + tupleBytes > maxStatementBytes) {
      throw new Error(
        `A ${spec.table} row (${spec.conflict.map(column => row[column]).join('/')}) needs ` +
          `${fixed + tupleBytes} bytes, over the ${maxStatementBytes}-byte statement limit`
      )
    }
    if (size + tupleBytes > maxStatementBytes) {
      statements.push(prefix + tuples.join(',\n') + suffix)
      tuples = []
      size = fixed
    }
    tuples.push(tuple)
    size += tupleBytes
  }
  if (tuples.length > 0) statements.push(prefix + tuples.join(',\n') + suffix)
  return statements
}

/** `<prefix> (…values…);`, split into as many statements as the statement limit needs. */
export function buildInLists(
  prefix: string,
  values: readonly SqlValue[],
  maxStatementBytes = DEFAULT_MAX_STATEMENT_BYTES
): string[] {
  const suffix = ');\n'
  const fixed = byteLength(prefix) + byteLength(suffix)
  const statements: string[] = []
  let literals: string[] = []
  let size = fixed
  for (const value of values) {
    const literal = sqlLiteral(value)
    if (literals.length > 0 && size + byteLength(literal) + 2 > maxStatementBytes) {
      statements.push(prefix + literals.join(', ') + suffix)
      literals = []
      size = fixed
    }
    literals.push(literal)
    size += byteLength(literal) + 2
  }
  if (literals.length > 0) statements.push(prefix + literals.join(', ') + suffix)
  return statements
}

export function buildDeletes(
  table: string,
  column: string,
  values: readonly SqlValue[],
  maxStatementBytes = DEFAULT_MAX_STATEMENT_BYTES
): string[] {
  return buildInLists(`DELETE FROM ${table} WHERE ${column} IN (`, values, maxStatementBytes)
}

/**
 * The final pass: sets every bout's `opponent_boxer_id`, once all boxers exist. One statement per
 * boxer with links (a `CASE` on `ordinal`), and one per chunk of boxers without any. Rows that
 * already hold the right value are skipped, so a re-run writes nothing.
 */
export function buildOpponentLinks(
  bouts: readonly Row[],
  maxStatementBytes = DEFAULT_MAX_STATEMENT_BYTES
): string[] {
  const links = new Map<number, [number, number][]>()
  const boxerIds: number[] = []
  for (const bout of bouts) {
    const boxerId = bout.boxer_id as number
    if (!links.has(boxerId)) {
      links.set(boxerId, [])
      boxerIds.push(boxerId)
    }
    if (bout.opponent_boxer_id !== null) {
      links.get(boxerId)!.push([bout.ordinal as number, bout.opponent_boxer_id as number])
    }
  }
  const statements: string[] = []
  const unlinked: number[] = []
  for (const boxerId of boxerIds) {
    const pairs = links.get(boxerId)!
    if (pairs.length === 0) {
      unlinked.push(boxerId)
      continue
    }
    const cases = pairs.map(([ordinal, opponent]) => `WHEN ${ordinal} THEN ${opponent}`).join(' ')
    const value = `CASE ordinal ${cases} ELSE NULL END`
    const statement =
      `UPDATE bouts SET opponent_boxer_id = ${value}\n` +
      `WHERE boxer_id = ${sqlLiteral(boxerId)} AND opponent_boxer_id IS NOT (${value});\n`
    if (byteLength(statement) > maxStatementBytes) {
      throw new Error(`Boxer ${boxerId}'s opponent links exceed the statement limit`)
    }
    statements.push(statement)
  }
  const clear = buildInLists(
    'UPDATE bouts SET opponent_boxer_id = NULL WHERE opponent_boxer_id IS NOT NULL AND boxer_id IN (',
    unlinked,
    maxStatementBytes
  )
  return [...statements, ...clear]
}

/**
 * Every statement of an import, in dependency order:
 * 1. upsert the 17 divisions (boxers reference them);
 * 2. upsert boxers on the pipeline `id`, the primary key. `boxrec_id` is never rewritten: the
 *    importer refuses a source whose `id`/`boxrec_id` pairs disagree with the target, and the
 *    unique index rejects a `boxrec_id` that arrives under a new `id`;
 * 3. replace each boxer's bouts: upsert on `(boxer_id, ordinal)`, then delete the ordinals past
 *    the end of the list. The end state matches delete-then-insert, but unchanged bouts keep
 *    their ids and are not rewritten, nor even attempted (`skipUnchanged`: `bouts.id` is
 *    `AUTOINCREMENT`), so `sqlite_sequence` stays put too;
 * 4. the final pass: resolve `opponent_boxer_id` (`buildOpponentLinks`).
 *
 * Upserts set `imported_at` explicitly whenever they change a row (the column default only
 * applies on insert); a row that already matches the source is skipped.
 */
export function buildImportStatements(
  dataset: Pick<ImportDataset, 'divisions' | 'boxers' | 'bouts' | 'records'>,
  maxStatementBytes = DEFAULT_MAX_STATEMENT_BYTES
): string[] {
  const divisions = buildUpserts(
    { table: 'divisions', columns: DIVISION_COLUMNS, conflict: ['slug'] },
    dataset.divisions,
    maxStatementBytes
  )
  const boxers = buildUpserts(
    {
      table: 'boxers',
      columns: BOXER_COLUMNS,
      conflict: ['id'],
      keep: ['boxrec_id'],
      touch: 'imported_at = CURRENT_TIMESTAMP'
    },
    dataset.boxers,
    maxStatementBytes
  )
  // Links are left to the final pass: new rows start unlinked, existing ones keep theirs.
  const bouts = buildUpserts(
    {
      table: 'bouts',
      columns: BOUT_COLUMNS,
      conflict: ['boxer_id', 'ordinal'],
      keep: ['opponent_boxer_id'],
      skipUnchanged: true
    },
    dataset.bouts.map(bout => ({ ...bout, opponent_boxer_id: null })),
    maxStatementBytes
  )
  const trims = dataset.records.map(
    record =>
      `DELETE FROM bouts WHERE boxer_id = ${sqlLiteral(record.id)} AND ordinal >= ${sqlLiteral(record.bouts?.length ?? 0)};\n`
  )
  return [
    ...divisions,
    ...boxers,
    ...bouts,
    ...trims,
    ...buildOpponentLinks(dataset.bouts, maxStatementBytes)
  ]
}

export interface ExistingBoxer {
  id: number
  boxrec_id: string
}

/**
 * The pipeline `id` is the primary key and must stay paired with its `boxrec_id`. Returns a
 * problem for every target row whose `id` or `boxrec_id` the source assigns to a different
 * partner; the importer refuses to run when there are any.
 */
export function findIdentityConflicts(
  existing: readonly ExistingBoxer[],
  boxers: readonly Row[]
): string[] {
  const boxrecById = new Map(boxers.map(row => [row.id as number, row.boxrec_id as string]))
  const idByBoxrec = new Map(boxers.map(row => [row.boxrec_id as string, row.id as number]))
  const problems: string[] = []
  for (const row of existing) {
    const boxrec = boxrecById.get(row.id)
    if (boxrec !== undefined && boxrec !== row.boxrec_id) {
      problems.push(`id ${row.id} is boxrec_id ${row.boxrec_id} in D1 but ${boxrec} in the source`)
    }
    const id = idByBoxrec.get(row.boxrec_id)
    if (id !== undefined && id !== row.id) {
      problems.push(`boxrec_id ${row.boxrec_id} is id ${row.id} in D1 but ${id} in the source`)
    }
  }
  return problems
}

/** Packs statements, in order, into files of at most `maxFileBytes`, named `0001.sql` onwards. */
export function packFiles(
  statements: readonly string[],
  maxFileBytes = DEFAULT_MAX_FILE_BYTES,
  label = 'import'
): SqlFile[] {
  const groups: string[][] = []
  let current: string[] = []
  let size = 0
  for (const statement of statements) {
    const bytes = byteLength(statement)
    if (current.length > 0 && size + bytes > maxFileBytes) {
      groups.push(current)
      current = []
      size = 0
    }
    current.push(statement)
    size += bytes
  }
  if (current.length > 0) groups.push(current)
  return groups.map((group, index) => {
    const sql =
      `-- boxingundefeated.com D1 ${label}, file ${index + 1} of ${groups.length}. ` +
      'Generated by scripts/d1/import-boxers.ts; do not edit.\n' +
      group.join('')
    return {
      name: `${String(index + 1).padStart(4, '0')}.sql`,
      sql,
      statements: group.length,
      bytes: byteLength(sql)
    }
  })
}

export function buildImportFiles(dataset: ImportDataset, limits: SqlLimits = {}): SqlFile[] {
  return packFiles(
    buildImportStatements(dataset, limits.maxStatementBytes),
    limits.maxFileBytes ?? DEFAULT_MAX_FILE_BYTES
  )
}
