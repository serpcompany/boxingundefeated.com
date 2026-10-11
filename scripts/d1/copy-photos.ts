/**
 * Copies boxer photos from boxrec.com into the target's R2 photo bucket and records each copy in
 * its D1 `photos` table, which is how pages find them (#64). One run copies what earlier runs
 * didn't, so it is resumable and, once everything is copied, a no-op.
 *
 * Usage:
 *   pnpm db:copy-photos -- --target local [--source <boxers.json>] [--limit <n>]
 *                          [--max-minutes <n>] [--interval-ms <ms>] [--summary <file>]
 *   pnpm db:copy-photos -- --target staging --source <boxers.json> ...      # d1-import.yml only
 *   pnpm db:copy-photos -- --target production --confirm-production --source <boxers.json> ...
 *                          # d1-import.yml's production job only, after the owner approved it
 *
 * - The photos are the source's `avatarImage` URLs on boxrec.com, once each, without BoxRec's
 *   placeholder, in the order `/boxers/` lists their boxers (`photoSources`), less those D1
 *   already records. `--limit` copies at most that many.
 * - Politely: one request at a time, at least `--interval-ms` apart (500, so 2 a second; never
 *   under 250), with the user agent `PHOTO_USER_AGENT`, honouring `Retry-After`
 *   (packages/data-ops/src/import/photos.ts). It stops after 25 refusals in a row (403, 429,
 *   5xx or no answer, after retries), which look like a block, and once `--max-minutes` have
 *   passed; both leave the rest to the next run. A failed photo is tried again on every run.
 * - Each photo is kept under `photos/<sha256>.<ext>` (packages/data-ops/src/photos.ts). Every 100
 *   copies, the new objects go up with `wrangler r2 bulk put`, then their rows into D1, so a row
 *   always names an object that exists. A key D1 already records is never written again: pages
 *   link only keys D1 records, so no page, cache or browser holds a key this writes. A run that
 *   failed between the two steps writes the same bytes again under the same key.
 * - The summary counts the boxers with and without a photo, the photos copied before and in this
 *   run, the failures by reason and what is left. `--summary <file>` appends it as Markdown
 *   (`$GITHUB_STEP_SUMMARY` in CI).
 *
 * Staging and production run only in .github/workflows/d1-import.yml, before `db:import`, whose
 * finish changes the page cache's generation so pages render with their new photos. The source
 * defaults like `db:import`'s; production needs an explicit `--source`, never under d1/fixtures/.
 */
import { spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { appendFileSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import {
  buildPhotoUpserts,
  checkProductionSourcePath,
  createPacer,
  fetchPhoto,
  type ImportTarget,
  PHOTO_DEFAULT_INTERVAL_MS,
  PHOTO_MIN_INTERVAL_MS,
  type PhotoRow,
  parseFlags,
  photoSources,
  resolveTarget,
  TARGET_FLAGS
} from '../../packages/data-ops/src/import'
import {
  PHOTO_CACHE_CONTROL,
  PHOTO_CONTENT_TYPES,
  photoKey
} from '../../packages/data-ops/src/photos'
import { loadDataset, resolveSource } from './import-boxers'
import { APP_DIR, d1Query, REPO_ROOT, WRANGLER_BIN } from './wrangler'

/** Each environment's photo bucket, bound to its Worker as `PHOTOS` (apps/web/wrangler.jsonc). */
export const PHOTO_BUCKETS: Record<ImportTarget['name'], string> = {
  local: 'boxingundefeated-com-photos-local',
  staging: 'boxingundefeated-com-photos-staging',
  production: 'boxingundefeated-com-photos-production'
}

/** Copies per upload and D1 write: one `INSERT` of at most `MAX_VALUES_ROWS` rows. */
const BATCH_SIZE = 100
/** Refusals (`PhotoFetchResult.refused`) in a row that look like a block, and stop the run. */
const STOP_AFTER_REFUSALS_IN_A_ROW = 25
const UPLOAD_CONCURRENCY = 4

const number = (value: number) => value.toLocaleString('en-US')

function positiveInteger(name: string, value: string | true | undefined): number | undefined {
  if (value === undefined) return undefined
  const parsed = Number(value)
  if (typeof value !== 'string' || !Number.isSafeInteger(parsed) || parsed < 1) {
    throw new Error(`--${name} takes a whole number of at least 1.`)
  }
  return parsed
}

/** Uploads `entries` with one content type; Wrangler fails the call if any upload fails. */
function bulkPut(
  target: ImportTarget['name'],
  entries: { key: string; file: string }[],
  contentType: string,
  scratch: string
): void {
  const list = join(scratch, `bulk-${Date.now()}.json`)
  writeFileSync(list, JSON.stringify(entries))
  const result = spawnSync(
    WRANGLER_BIN,
    [
      'r2',
      'bulk',
      'put',
      PHOTO_BUCKETS[target],
      '--filename',
      list,
      '--content-type',
      contentType,
      '--cache-control',
      PHOTO_CACHE_CONTROL,
      '--concurrency',
      String(UPLOAD_CONCURRENCY),
      target === 'local' ? '--local' : '--remote'
    ],
    { cwd: APP_DIR, encoding: 'utf8', env: { ...process.env, WRANGLER_SEND_METRICS: 'false' } }
  )
  rmSync(list, { force: true })
  if (result.error) throw result.error
  if (result.status !== 0) {
    const output = `${result.stdout ?? ''}\n${result.stderr ?? ''}`.trim()
    throw new Error(`wrangler r2 bulk put failed (exit ${result.status}):\n${output.slice(-4000)}`)
  }
}

interface Copy extends PhotoRow {
  /** The bytes on disk, when this run uploads the key; null when D1 already records it. */
  file: string | null
}

/** Uploads the batch's new objects, then records every copy in D1. */
function flush(target: ImportTarget, batch: Copy[], scratch: string): void {
  if (batch.length === 0) return
  const byType = new Map<string, { key: string; file: string }[]>()
  for (const copy of batch) {
    if (!copy.file) continue
    const entries = byType.get(copy.contentType) ?? []
    entries.push({ key: copy.key, file: copy.file })
    byType.set(copy.contentType, entries)
  }
  for (const [contentType, entries] of byType) bulkPut(target.name, entries, contentType, scratch)
  for (const statement of buildPhotoUpserts(batch)) d1Query(target, statement)
  for (const copy of batch) if (copy.file) rmSync(copy.file, { force: true })
}

interface Summary {
  target: string
  boxers: number
  boxersWithPhoto: number
  boxersWithoutPhoto: number
  photos: number
  offSite: number
  copiedBefore: number
  copied: number
  newObjects: number
  failures: Map<string, string[]>
  notTried: number
  stopped: string | null
  boxersShowingPhoto: number
}

function report(summary: Summary): string {
  const failed = [...summary.failures.values()].reduce((total, urls) => total + urls.length, 0)
  const rows: [string, string][] = [
    ['Boxers in the source', number(summary.boxers)],
    [
      "Without a photo (BoxRec's placeholder or none): the site's placeholder",
      number(summary.boxersWithoutPhoto)
    ],
    [
      'With a photo on boxrec.com',
      `${number(summary.boxersWithPhoto)} (${number(summary.photos)} distinct URLs)`
    ],
    ['Photo URLs elsewhere, never fetched', number(summary.offSite)],
    ['Copied before this run', number(summary.copiedBefore)],
    ['Copied in this run', `${number(summary.copied)} (${number(summary.newObjects)} new objects)`],
    ['Failed in this run', number(failed)],
    ['Left for the next run', number(summary.notTried)],
    [
      'Boxers whose page shows their photo now',
      `${number(summary.boxersShowingPhoto)} of ${number(summary.boxersWithPhoto)}`
    ]
  ]
  const lines = [
    `### Boxer photos, ${summary.target}`,
    '',
    '| | |',
    '| --- | ---: |',
    ...rows.map(([label, value]) => `| ${label} | ${value} |`)
  ]
  if (failed > 0) {
    lines.push('', '| Failure | Photos | Examples |', '| --- | ---: | --- |')
    for (const [reason, urls] of [...summary.failures].sort((a, b) => b[1].length - a[1].length)) {
      lines.push(`| ${reason} | ${number(urls.length)} | ${urls.slice(0, 3).join('<br>')} |`)
    }
  }
  if (summary.stopped) lines.push('', `**Stopped early:** ${summary.stopped}`)
  return `${lines.join('\n')}\n`
}

async function main(): Promise<void> {
  const flags = parseFlags(process.argv.slice(2), [
    ...TARGET_FLAGS,
    'source',
    'limit',
    'max-minutes',
    'interval-ms',
    'summary'
  ])
  const target = resolveTarget(flags)
  const sourcePath = resolveSource(flags.source)
  if (target.name === 'production') {
    checkProductionSourcePath(typeof flags.source === 'string' ? sourcePath : undefined, REPO_ROOT)
  }
  const limit = positiveInteger('limit', flags.limit)
  const maxMinutes = positiveInteger('max-minutes', flags['max-minutes'])
  const interval = positiveInteger('interval-ms', flags['interval-ms']) ?? PHOTO_DEFAULT_INTERVAL_MS
  if (interval < PHOTO_MIN_INTERVAL_MS) {
    throw new Error(`--interval-ms must be at least ${PHOTO_MIN_INTERVAL_MS}: stay polite.`)
  }
  const summaryFile = typeof flags.summary === 'string' ? resolve(flags.summary) : undefined
  const deadline = maxMinutes === undefined ? Infinity : Date.now() + maxMinutes * 60_000

  const dataset = loadDataset(sourcePath)
  const sources = photoSources(dataset.records)
  const copied = new Map(
    d1Query<{ source_url: string; key: string }>(target, 'SELECT source_url, key FROM photos').map(
      row => [row.source_url, row.key]
    )
  )
  const known = new Set(copied.values())
  const pending = sources.urls.filter(url => !copied.has(url))
  const queue = limit === undefined ? pending : pending.slice(0, limit)
  console.log(
    `${number(sources.urls.length)} photos in the source, ${number(sources.urls.length - pending.length)} ` +
      `already copied; copying ${number(queue.length)} into ${PHOTO_BUCKETS[target.name]} ` +
      `(${target.name}), one request every ${interval} ms at most.`
  )

  const summary: Summary = {
    target: target.name,
    boxers: dataset.records.length,
    boxersWithPhoto: sources.boxersWithPhoto,
    boxersWithoutPhoto: sources.boxersWithoutPhoto,
    photos: sources.urls.length,
    offSite: sources.offSite.length,
    copiedBefore: sources.urls.length - pending.length,
    copied: 0,
    newObjects: 0,
    failures: new Map(),
    notTried: 0,
    stopped: null,
    boxersShowingPhoto: 0
  }
  const pacer = createPacer(interval)
  const scratch = mkdtempSync(join(tmpdir(), 'boxer-photos-'))
  let batch: Copy[] = []
  let refusalsInARow = 0
  let index = 0
  try {
    for (; index < queue.length; index++) {
      if (Date.now() >= deadline) {
        summary.stopped = `the ${maxMinutes}-minute budget ran out.`
        break
      }
      if (refusalsInARow >= STOP_AFTER_REFUSALS_IN_A_ROW) {
        summary.stopped =
          `boxrec.com refused or failed ${STOP_AFTER_REFUSALS_IN_A_ROW} photos in a row ` +
          '(403, 429, 5xx or no answer); stopped so as not to keep knocking.'
        break
      }
      const url = queue[index]!
      const result = await fetchPhoto(url, { pace: pacer.wait })
      if (!result.ok) {
        // A photo that is gone (404) says nothing about a block, so it neither counts nor resets.
        if (result.refused) refusalsInARow++
        const urls = summary.failures.get(result.reason) ?? []
        urls.push(url)
        summary.failures.set(result.reason, urls)
        console.log(`  failed ${url}: ${result.reason}`)
        continue
      }
      refusalsInARow = 0
      const sha256 = createHash('sha256').update(result.bytes).digest('hex')
      const key = photoKey(sha256, result.extension)
      let file: string | null = null
      if (!known.has(key)) {
        file = join(scratch, key.replace('/', '-'))
        writeFileSync(file, result.bytes)
        known.add(key)
        summary.newObjects++
      }
      batch.push({
        sourceUrl: url,
        key,
        contentType: PHOTO_CONTENT_TYPES[result.extension],
        bytes: result.bytes.byteLength,
        file
      })
      if (batch.length >= BATCH_SIZE) {
        flush(target, batch, scratch)
        for (const copy of batch) copied.set(copy.sourceUrl, copy.key)
        summary.copied += batch.length
        batch = []
        console.log(`  ${number(summary.copied)} of ${number(queue.length)} copied`)
      }
    }
    flush(target, batch, scratch)
    for (const copy of batch) copied.set(copy.sourceUrl, copy.key)
    summary.copied += batch.length
    batch = []
  } finally {
    rmSync(scratch, { recursive: true, force: true })
  }

  summary.notTried = pending.length - index
  summary.boxersShowingPhoto = dataset.records.filter(
    record => record.avatarImage !== null && copied.has(record.avatarImage)
  ).length
  const text = report(summary)
  console.log(`\n${text}`)
  if (summaryFile) appendFileSync(summaryFile, `${text}\n`)
  if (summary.stopped) {
    const prefix = process.env.GITHUB_ACTIONS === 'true' ? '::warning::' : 'Warning: '
    console.log(`${prefix}Boxer photos stopped early: ${summary.stopped} Run it again to go on.`)
  }
}

if (import.meta.filename === resolve(process.argv[1] ?? '')) {
  main().catch(error => {
    console.error(error instanceof Error ? error.message : String(error))
    process.exitCode = 1
  })
}
