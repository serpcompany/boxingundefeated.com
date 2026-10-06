/**
 * Imports the pipeline's boxers into D1, idempotently.
 *
 * Usage:
 *   pnpm db:import -- --target local|staging [--source <boxers.json>] [--out-dir <dir>]
 *                     [--allow-prune <n>] [--dry-run]
 *   pnpm db:seed:local    # the committed fixture, d1/fixtures/boxers.sample.json
 *
 * The source defaults to $BOXERS_SOURCE, then from-pipeline/boxers.json in the repo root. The SQL
 * files land in d1/.import/<target>/ (gitignored). Production is refused: it runs via the
 * owner/CI. A remote import refuses to prune more than 1 % of the boxers (at most 50) unless
 * `--allow-prune <n>` allows that many.
 */
import { createHash } from 'node:crypto'
import { mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { join, relative, resolve } from 'node:path'
import {
  buildImportFiles,
  buildPrune,
  checkOutDir,
  checkPrune,
  type ExistingBoxer,
  GENERATED_SQL_FILE,
  type ImportDataset,
  type ImportTarget,
  packFiles,
  parseFlags,
  planImport,
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
  checkOutDir(directory, REPO_ROOT)
  mkdirSync(directory, { recursive: true })
  for (const name of readdirSync(directory)) {
    if (GENERATED_SQL_FILE.test(name)) rmSync(join(directory, name))
  }
  for (const file of files) writeFileSync(join(directory, file.name), file.sql)
}

/**
 * Refuses a source whose `id`/`boxrec_id` pairs or slugs conflict with the target, or that would
 * prune more boxers than allowed, then returns the target boxers the source no longer has (or
 * drops on purpose).
 */
function staleBoxers(
  target: ImportTarget,
  dataset: ImportDataset,
  allowPrune: number | undefined
): ExistingBoxer[] {
  const existing = d1Query<ExistingBoxer>(
    target,
    'SELECT id, boxrec_id, slug FROM boxers ORDER BY id'
  )
  const { conflicts, stale } = planImport(existing, dataset.boxers)
  if (conflicts.length > 0) {
    throw new Error(
      `Refusing to import: the pipeline id is the primary key and keeps its boxrec_id, and a ` +
        `slug may not move to another boxer. Nothing was applied.\n` +
        conflicts
          .slice(0, 20)
          .map(problem => `  - ${problem}`)
          .join('\n')
    )
  }
  checkPrune(target.name, existing.length, stale, allowPrune)
  return stale
}

function parseAllowPrune(value: string | true | undefined): number | undefined {
  if (value === undefined) return undefined
  const count = Number(value)
  if (typeof value !== 'string' || !Number.isSafeInteger(count) || count < 0) {
    throw new Error('--allow-prune takes the number of boxers the import may prune.')
  }
  return count
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
  const flags = parseFlags(process.argv.slice(2), [
    'target',
    'source',
    'out-dir',
    'allow-prune',
    'dry-run'
  ])
  const target = resolveTarget(typeof flags.target === 'string' ? flags.target : undefined)
  const allowPrune = parseAllowPrune(flags['allow-prune'])
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
  const stale = staleBoxers(target, dataset, allowPrune)
  const toApply = files.map(file => ({ ...file, path: join(outDir, file.name) }))
  if (stale.length > 0) {
    // Runs first: it frees slugs and ids, cascades the stale boxers' bouts and unlinks them.
    const ids = stale.map(row => row.id)
    const [prune] = packFiles(buildPrune(ids), Infinity, 'prune')
    const path = join(outDir, '0000-prune.sql')
    writeFileSync(path, prune!.sql)
    toApply.unshift({ ...prune!, name: '0000-prune.sql', path })
    const shown = stale.slice(0, 50).map(row => row.slug)
    const more = stale.length > 50 ? `, … and ${stale.length - 50} more` : ''
    console.log(
      `  pruning ${stale.length} boxer(s) the source no longer has: ${shown.join(', ')}${more}`
    )
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
