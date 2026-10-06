/**
 * Imports the pipeline's boxers into D1, idempotently.
 *
 * Usage:
 *   pnpm db:import -- --target local|staging [--source <boxers.json>] [--out-dir <dir>] [--dry-run]
 *   pnpm db:seed:local    # the committed fixture, d1/fixtures/boxers.sample.json
 *
 * The source defaults to $BOXERS_SOURCE, then from-pipeline/boxers.json in the repo root. The SQL
 * files land in d1/.import/<target>/ (gitignored). Production is refused: it runs via the
 * owner/CI.
 */
import { createHash } from 'node:crypto'
import { mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { join, relative, resolve } from 'node:path'
import {
  buildDeletes,
  buildImportFiles,
  type ExistingBoxer,
  findIdentityConflicts,
  type ImportDataset,
  type ImportTarget,
  packFiles,
  parseFlags,
  prepareDataset,
  resolveTarget,
  type SqlFile
} from '../../packages/data-ops/src/import'
import { d1ExecuteFile, d1Query, REPO_ROOT } from './wrangler'

export function resolveSource(value: string | true | undefined): string {
  if (typeof value === 'string') return resolve(process.cwd(), value)
  return resolve(REPO_ROOT, process.env.BOXERS_SOURCE ?? 'from-pipeline/boxers.json')
}

export function loadDataset(sourcePath: string): ImportDataset {
  return prepareDataset(JSON.parse(readFileSync(sourcePath, 'utf8')))
}

const seconds = (start: number) => `${((performance.now() - start) / 1000).toFixed(1)} s`
const number = (value: number) => value.toLocaleString('en-US')

function writeFiles(directory: string, files: SqlFile[]): void {
  mkdirSync(directory, { recursive: true })
  for (const name of readdirSync(directory)) {
    if (name.endsWith('.sql')) rmSync(join(directory, name))
  }
  for (const file of files) writeFileSync(join(directory, file.name), file.sql)
}

/**
 * Refuses a source whose `id`/`boxrec_id` pairs disagree with the target, then returns the ids
 * of target boxers the source no longer has (or drops on purpose).
 */
function staleBoxerIds(target: ImportTarget, dataset: ImportDataset): number[] {
  const existing = d1Query<ExistingBoxer>(target, 'SELECT id, boxrec_id FROM boxers ORDER BY id')
  const conflicts = findIdentityConflicts(existing, dataset.boxers)
  if (conflicts.length > 0) {
    throw new Error(
      `Refusing to import: the pipeline id is the primary key and must keep its boxrec_id.\n` +
        conflicts
          .slice(0, 20)
          .map(problem => `  - ${problem}`)
          .join('\n')
    )
  }
  const kept = new Set(dataset.boxers.map(row => row.id))
  return existing.map(row => row.id).filter(id => !kept.has(id))
}

function verifyCounts(target: ImportTarget, dataset: ImportDataset): void {
  const [actual] = d1Query<Record<string, number>>(
    target,
    `SELECT (SELECT count(*) FROM divisions) AS divisions, (SELECT count(*) FROM boxers) AS boxers,
      (SELECT count(*) FROM bouts) AS bouts,
      (SELECT count(*) FROM bouts WHERE opponent_boxer_id IS NOT NULL) AS opponent_links`
  )
  const expected: Record<string, number> = {
    divisions: dataset.divisions.length,
    boxers: dataset.boxers.length,
    bouts: dataset.bouts.length,
    opponent_links: dataset.quirks.opponentLinks
  }
  const wrong = Object.keys(expected).filter(key => actual?.[key] !== expected[key])
  for (const key of Object.keys(expected)) {
    console.log(`  ${key}: ${number(actual?.[key] ?? 0)} (expected ${number(expected[key]!)})`)
  }
  if (wrong.length > 0) throw new Error(`Row counts differ from the source: ${wrong.join(', ')}`)
}

function main(): void {
  const flags = parseFlags(process.argv.slice(2), ['target', 'source', 'out-dir', 'dry-run'])
  const target = resolveTarget(typeof flags.target === 'string' ? flags.target : undefined)
  const sourcePath = resolveSource(flags.source)
  const started = performance.now()

  const dataset = loadDataset(sourcePath)
  console.log(
    `Validated ${relative(process.cwd(), sourcePath) || sourcePath}: ` +
      `${number(dataset.sourceCounts.boxers)} boxers, ${number(dataset.sourceCounts.bouts)} bouts.`
  )
  for (const drop of dataset.dropped) console.log(`  dropped ${drop.slug}: ${drop.reason}`)

  const files = buildImportFiles(dataset)
  const outDir = resolve(
    process.cwd(),
    typeof flags['out-dir'] === 'string'
      ? flags['out-dir']
      : join(REPO_ROOT, 'd1/.import', target.name)
  )
  writeFiles(outDir, files)
  const plan = createHash('sha256')
  for (const file of files) plan.update(file.sql)
  const statements = files.reduce((total, file) => total + file.statements, 0)
  console.log(
    `Wrote ${files.length} SQL files (${number(statements)} statements, largest file ` +
      `${number(Math.max(...files.map(file => file.bytes)))} bytes) to ${relative(REPO_ROOT, outDir)}; ` +
      `plan sha256 ${plan.digest('hex').slice(0, 16)} (${seconds(started)}).`
  )
  if (flags['dry-run']) return

  console.log(`Importing into ${target.database} (${target.flags.join(' ')}).`)
  const stale = staleBoxerIds(target, dataset)
  const toApply = files.map(file => ({ ...file, path: join(outDir, file.name) }))
  if (stale.length > 0) {
    // Runs first: it frees slugs and ids, cascades the stale boxers' bouts and unlinks them.
    const [prune] = packFiles(buildDeletes('boxers', 'id', stale), Infinity, 'prune')
    const path = join(outDir, '0000-prune.sql')
    writeFileSync(path, prune!.sql)
    toApply.unshift({ ...prune!, name: '0000-prune.sql', path })
    console.log(`  pruning ${stale.length} boxer(s) the source no longer has`)
  }

  let rowsWritten = 0
  for (const file of toApply) {
    const fileStarted = performance.now()
    const result = d1ExecuteFile(target, file.path)
    if (result.rowsWritten !== null) rowsWritten += result.rowsWritten
    const written =
      result.rowsWritten === null ? '' : `, ${number(result.rowsWritten)} rows written`
    console.log(
      `  ${file.name}: ${number(file.statements)} statements${written} (${seconds(fileStarted)})`
    )
  }
  if (target.name !== 'local') console.log(`Rows written in total: ${number(rowsWritten)}.`)
  console.log('Verifying row counts:')
  verifyCounts(target, dataset)
  console.log(`Imported into ${target.name} in ${seconds(started)}.`)
}

if (import.meta.filename === resolve(process.argv[1] ?? '')) {
  try {
    main()
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error))
    process.exitCode = 1
  }
}
