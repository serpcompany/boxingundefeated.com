import type { ImportDataset } from './dataset'
import { BOUT_COLUMNS, BOXER_COLUMNS, DIVISION_COLUMNS, type Row, type SqlValue } from './rows'
import type { ImportTarget } from './targets'

/** D1's limit on one SQL statement (https://developers.cloudflare.com/d1/platform/limits/). */
export const D1_MAX_STATEMENT_BYTES = 100_000
export const DEFAULT_MAX_STATEMENT_BYTES = 90_000
/** Each file is one `wrangler d1 execute --file` call: one transaction, rolled back on failure. */
export const DEFAULT_MAX_FILE_BYTES = 4_000_000
/**
 * Rows per `VALUES` list. D1's SQLite runs out of memory (`SQLITE_NOMEM`) somewhere between
 * 3,000 and 5,570 rows, well under the byte limit when the rows are small.
 */
export const MAX_VALUES_ROWS = 500

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

/**
 * Marks a boxer as changed by this import. The boxer upsert sets it when the boxer row changes;
 * the statements below set it when only the boxer's bouts or opponent links change.
 */
export const TOUCH_BOXERS = 'UPDATE boxers SET imported_at = CURRENT_TIMESTAMP WHERE id IN'

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
  /**
   * With `skipUnchanged`: before each upsert, `TOUCH_BOXERS` the boxers (by this column) that own
   * an incoming row that is new or differs.
   */
  touchBoxersBy?: string
}

const updatedColumns = ({ columns, conflict, keep = [] }: UpsertSpec) =>
  columns.filter(column => !conflict.includes(column) && !keep.includes(column))

/** `NOT EXISTS (…)`: the `incoming` row is new, or differs from the stored row. */
function differsFromStored(spec: UpsertSpec): string {
  const matches = [
    ...spec.conflict.map(column => `stored.${column} = incoming.${column}`),
    ...updatedColumns(spec).map(column => `stored.${column} IS incoming.${column}`)
  ]
  return `NOT EXISTS (SELECT 1 FROM ${spec.table} AS stored WHERE ${matches.join(' AND ')})`
}

/**
 * `INSERT … ON CONFLICT DO UPDATE … WHERE <a column differs>`: a row that already matches is
 * not written at all, so re-running an import writes nothing. Not `INSERT OR REPLACE`, which
 * deletes the row and so cascades to its bouts and unlinks opponents. With `skipUnchanged`, the
 * rows come from a `WITH incoming (…) AS (VALUES …)` and only those that differ are inserted.
 * Returns the statement templates, split around the `VALUES` tuples.
 */
function upsertTemplates(spec: UpsertSpec): [prefix: string, suffix: string][] {
  const { table, columns, conflict, touch } = spec
  const updated = updatedColumns(spec)
  const assignments = updated.map(column => `${column} = excluded.${column}`)
  if (touch) assignments.push(touch)
  const changed = updated.map(column => `${table}.${column} IS NOT excluded.${column}`)
  const onConflict =
    `\nON CONFLICT (${conflict.join(', ')}) DO UPDATE SET ${assignments.join(', ')}` +
    `\nWHERE ${changed.join(' OR ')};\n`
  if (!spec.skipUnchanged) {
    return [[`INSERT INTO ${table} (${columns.join(', ')}) VALUES\n`, onConflict]]
  }
  const values = `WITH incoming (${columns.join(', ')}) AS (VALUES\n`
  const upsert: [string, string] = [
    values,
    `)\nINSERT INTO ${table} (${columns.join(', ')})\n` +
      `SELECT * FROM incoming WHERE ${differsFromStored(spec)}${onConflict}`
  ]
  if (!spec.touchBoxersBy) return [upsert]
  const touchBoxers: [string, string] = [
    values,
    `)\n${TOUCH_BOXERS} (SELECT ${spec.touchBoxersBy} FROM incoming WHERE ${differsFromStored(spec)});\n`
  ]
  return [touchBoxers, upsert]
}

/**
 * Splits items into groups whose `fixedBytes` plus items (each with a 2-byte separator) stay under
 * `maxStatementBytes`, with at most `maxItems` per group. `describe` names an item that can't fit
 * on its own.
 */
function chunk(
  items: readonly string[],
  fixedBytes: number,
  maxStatementBytes: number,
  describe: (index: number) => string,
  maxItems = Number.POSITIVE_INFINITY
): string[][] {
  const groups: string[][] = []
  let group: string[] = []
  let size = fixedBytes
  items.forEach((item, index) => {
    const bytes = byteLength(item) + 2
    if (fixedBytes + bytes > maxStatementBytes) {
      throw new Error(
        `${describe(index)} needs ${fixedBytes + bytes} bytes, over the ${maxStatementBytes}-byte statement limit`
      )
    }
    if (group.length > 0 && (size + bytes > maxStatementBytes || group.length >= maxItems)) {
      groups.push(group)
      group = []
      size = fixedBytes
    }
    group.push(item)
    size += bytes
  })
  if (group.length > 0) groups.push(group)
  return groups
}

/** Multi-row upserts, each statement as many rows as fit under `maxStatementBytes`. */
export function buildUpserts(
  spec: UpsertSpec,
  rows: readonly Row[],
  maxStatementBytes = DEFAULT_MAX_STATEMENT_BYTES
): string[] {
  const templates = upsertTemplates(spec)
  const fixed = Math.max(...templates.map(([pre, post]) => byteLength(pre) + byteLength(post)))
  const tuples = rows.map(
    row => `(${spec.columns.map(column => sqlLiteral(row[column] ?? null)).join(', ')})`
  )
  const describe = (index: number) =>
    `A ${spec.table} row (${spec.conflict.map(column => rows[index]![column]).join('/')})`
  return chunk(tuples, fixed, maxStatementBytes, describe, MAX_VALUES_ROWS).flatMap(group =>
    templates.map(([prefix, suffix]) => prefix + group.join(',\n') + suffix)
  )
}

/**
 * Deletes boxers the source no longer has. Their bouts cascade and other boxers' links to them
 * become `NULL`, so those boxers are touched first.
 */
export function buildPrune(
  ids: readonly number[],
  maxStatementBytes = DEFAULT_MAX_STATEMENT_BYTES
): string[] {
  const touch = `${TOUCH_BOXERS} (SELECT boxer_id FROM bouts WHERE opponent_boxer_id IN (`
  return chunk(
    ids.map(sqlLiteral),
    byteLength(touch) + 4,
    maxStatementBytes,
    index => `Boxer ${ids[index]}`
  ).flatMap(group => [
    `${touch}${group.join(', ')}));\n`,
    `DELETE FROM boxers WHERE id IN (${group.join(', ')});\n`
  ])
}

/**
 * Deletes each boxer's bouts past the end of its source list, touching the boxers that lose any.
 */
export function buildTrims(
  records: readonly { id: number; bouts: readonly unknown[] | null }[],
  maxStatementBytes = DEFAULT_MAX_STATEMENT_BYTES
): string[] {
  const lengths = records.map(
    record => `(${sqlLiteral(record.id)}, ${sqlLiteral(record.bouts?.length ?? 0)})`
  )
  const prefix = 'WITH lists (boxer_id, bout_count) AS (VALUES\n'
  const suffix =
    `)\n${TOUCH_BOXERS} (SELECT lists.boxer_id FROM lists JOIN bouts ` +
    'ON bouts.boxer_id = lists.boxer_id AND bouts.ordinal >= lists.bout_count);\n'
  const fixed = byteLength(prefix) + byteLength(suffix)
  const touches = chunk(
    lengths,
    fixed,
    maxStatementBytes,
    i => `Boxer ${records[i]!.id}`,
    MAX_VALUES_ROWS
  ).map(group => prefix + group.join(',\n') + suffix)
  const deletes = records.map(
    record =>
      `DELETE FROM bouts WHERE boxer_id = ${sqlLiteral(record.id)} AND ordinal >= ${sqlLiteral(record.bouts?.length ?? 0)};\n`
  )
  return [...touches, ...deletes]
}

/**
 * The final pass: sets every bout's `opponent_boxer_id`, once all boxers exist. Per boxer with
 * links, a `CASE` on `ordinal`; per chunk of boxers without any, a reset to `NULL`. Each is
 * preceded by a statement that touches the boxers whose links are about to change. Rows that
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
    const stale = `boxer_id = ${sqlLiteral(boxerId)} AND opponent_boxer_id IS NOT (${value})`
    const pair = [
      `${TOUCH_BOXERS} (SELECT boxer_id FROM bouts WHERE ${stale});\n`,
      `UPDATE bouts SET opponent_boxer_id = ${value}\nWHERE ${stale};\n`
    ]
    if (pair.some(statement => byteLength(statement) > maxStatementBytes)) {
      throw new Error(`Boxer ${boxerId}'s opponent links exceed the statement limit`)
    }
    statements.push(...pair)
  }
  const linked = 'opponent_boxer_id IS NOT NULL AND boxer_id IN ('
  const touch = `${TOUCH_BOXERS} (SELECT boxer_id FROM bouts WHERE ${linked}`
  const clears = chunk(
    unlinked.map(sqlLiteral),
    byteLength(touch) + 4,
    maxStatementBytes,
    index => `Boxer ${unlinked[index]}`
  ).flatMap(group => [
    `${touch}${group.join(', ')}));\n`,
    `UPDATE bouts SET opponent_boxer_id = NULL WHERE ${linked}${group.join(', ')});\n`
  ])
  return [...statements, ...clears]
}

/**
 * Every statement of an import, in dependency order:
 * 1. upsert the 17 divisions (boxers reference them);
 * 2. upsert boxers on the pipeline `id`, the primary key. `boxrec_id` and `slug` moves are
 *    refused before any statement runs (`planImport`); the unique indexes are the backstop;
 * 3. replace each boxer's bouts: upsert on `(boxer_id, ordinal)`, then delete the ordinals past
 *    the end of the list. The end state matches delete-then-insert, but unchanged bouts keep
 *    their ids and are not rewritten, nor even attempted (`skipUnchanged`: `bouts.id` is
 *    `AUTOINCREMENT`), so `sqlite_sequence` stays put too;
 * 4. the final pass: resolve `opponent_boxer_id` (`buildOpponentLinks`).
 *
 * `imported_at` is set explicitly (the column default only applies on insert) whenever the
 * import changes what a boxer's page shows: the boxer row, its bouts, or its opponent links.
 * Nothing that already matches the source is written.
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
      skipUnchanged: true,
      touchBoxersBy: 'boxer_id'
    },
    dataset.bouts.map(bout => ({ ...bout, opponent_boxer_id: null })),
    maxStatementBytes
  )
  return [
    ...divisions,
    ...boxers,
    ...bouts,
    ...buildTrims(dataset.records, maxStatementBytes),
    ...buildOpponentLinks(dataset.bouts, maxStatementBytes)
  ]
}

export interface ExistingBoxer {
  id: number
  boxrec_id: string
  slug: string
}

export interface ImportPlan {
  /** Identity changes the importer refuses: it applies nothing while there are any. */
  conflicts: string[]
  /** Target boxers the source no longer has (or drops on purpose), in id order. */
  stale: ExistingBoxer[]
}

/**
 * Checks the source against the boxers already in the target. The pipeline `id` is the primary
 * key and must stay paired with its `boxrec_id`. A slug may change (a public URL change, so it
 * needs a redirect), but may not move to another boxer that stays: that is refused up front,
 * rather than failing partway through with `UNIQUE constraint failed: boxers.slug`. A stale
 * boxer's slug is free to reuse, because the prune runs first.
 */
export function planImport(existing: readonly ExistingBoxer[], boxers: readonly Row[]): ImportPlan {
  const byId = new Map(boxers.map(row => [row.id as number, row]))
  const idByBoxrec = new Map(boxers.map(row => [row.boxrec_id as string, row.id as number]))
  const idBySlug = new Map(boxers.map(row => [row.slug as string, row.id as number]))
  const conflicts: string[] = []
  const stale: ExistingBoxer[] = []
  for (const row of existing) {
    const source = byId.get(row.id)
    if (source === undefined) stale.push(row)
    if (source !== undefined && source.boxrec_id !== row.boxrec_id) {
      conflicts.push(
        `id ${row.id} is boxrec_id ${row.boxrec_id} in D1 but ${source.boxrec_id} in the source`
      )
    }
    const id = idByBoxrec.get(row.boxrec_id)
    if (id !== undefined && id !== row.id) {
      conflicts.push(`boxrec_id ${row.boxrec_id} is id ${row.id} in D1 but ${id} in the source`)
    }
    const slugOwner = idBySlug.get(row.slug)
    if (source !== undefined && slugOwner !== undefined && slugOwner !== row.id) {
      conflicts.push(
        `slug ${row.slug} moves from id ${row.id} (now ${String(source.slug)}) to id ${slugOwner}`
      )
    }
  }
  return { conflicts, stale }
}

/** A staging import prunes at most 1 % of the target, and never more than this, without `--allow-prune`. */
export const REMOTE_PRUNE_LIMIT = 50

/**
 * Refuses a prune larger than the limit, which catches a fixture or truncated file passed to a
 * remote target. Production prunes nothing without `--allow-prune`. Local targets are disposable
 * and prune freely (`db:seed:local` relies on it).
 */
export function checkPrune(
  target: ImportTarget['name'],
  existing: number,
  stale: readonly ExistingBoxer[],
  allowPrune?: number
): void {
  if (target === 'local' || stale.length === 0) return
  const limit =
    allowPrune ??
    (target === 'production' ? 0 : Math.min(REMOTE_PRUNE_LIMIT, Math.floor(existing / 100)))
  if (stale.length <= limit) return
  const listed = stale.slice(0, 50).map(row => `  - ${row.slug} (id ${row.id})`)
  const more = stale.length > 50 ? [`  … and ${stale.length - 50} more`] : []
  throw new Error(
    [
      `Refusing to prune ${stale.length} of ${existing} boxers from ${target} (the limit is ` +
        `${limit}). Their URLs would stop resolving. If that is intended, re-run with ` +
        `--allow-prune ${stale.length}. The boxers:`,
      ...listed,
      ...more
    ].join('\n')
  )
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
