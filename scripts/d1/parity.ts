/**
 * Proves a D1 import lost nothing: row counts, slug coverage, every row field by field against
 * the source, a seeded sample against today's per-boxer JSON, and opponent links against today's
 * matching. Writes a Markdown report and exits 1 on any mismatch.
 *
 * Usage:
 *   pnpm db:parity -- --target local|staging [--source <boxers.json>] [--sample 200] [--seed 9]
 *                     [--out d1/reports/parity-<target>.md]
 */
import { createHash } from 'node:crypto'
import { mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import { dirname, join, relative, resolve } from 'node:path'
import { getOpponentSlug } from '../../apps/web/lib/opponent-mapper'
import {
  BOUT_COLUMNS,
  BOXER_COLUMNS,
  CONTENT_COLUMNS,
  DIVISION_COLUMNS,
  type ImportDataset,
  type ImportTarget,
  parseFlags,
  type Row,
  resolveTarget,
  rowsChecksum,
  type SourceBoxer,
  type TableName,
  toBoutRow,
  toBoxerRow
} from '../../packages/data-ops/src/import'
import { loadDataset, resolveSource } from './import-boxers'
import { APP_DIR, d1Query, REPO_ROOT } from './wrangler'

const PUBLIC_BOXERS = join(APP_DIR, 'public/data/boxers')
const BOXER_PAGE = 1_000
const BOUT_PAGE = 10_000
const number = (value: number) => value.toLocaleString('en-US')

interface Mismatch {
  where: string
  column: string
  expected: unknown
  actual: unknown
}

interface Snapshot {
  divisions: Row[]
  boxers: Row[]
  bouts: Row[]
}

/** Every row, in key order, paged so no single D1 response is large. */
function readSnapshot(target: ImportTarget): Snapshot {
  const divisions = d1Query<Row>(target, 'SELECT * FROM divisions ORDER BY sort_order')
  const boxers: Row[] = []
  for (let last = 0; ; ) {
    const page = d1Query<Row>(
      target,
      `SELECT * FROM boxers WHERE id > ${last} ORDER BY id LIMIT ${BOXER_PAGE}`
    )
    boxers.push(...page)
    if (page.length < BOXER_PAGE) break
    last = page.at(-1)!.id as number
  }
  const bouts: Row[] = []
  for (let boxer = 0, ordinal = -1; ; ) {
    const page = d1Query<Row>(
      target,
      `SELECT * FROM bouts WHERE (boxer_id, ordinal) > (${boxer}, ${ordinal})
        ORDER BY boxer_id, ordinal LIMIT ${BOUT_PAGE}`
    )
    bouts.push(...page)
    if (page.length < BOUT_PAGE) break
    boxer = page.at(-1)!.boxer_id as number
    ordinal = page.at(-1)!.ordinal as number
  }
  return { divisions, boxers, bouts }
}

const keyOf: Record<TableName, (row: Row) => string> = {
  divisions: row => String(row.slug),
  boxers: row => `boxer ${row.id} (${row.slug})`,
  bouts: row => `bout ${row.boxer_id}#${row.ordinal}`
}

function compareRows(
  table: TableName,
  expected: readonly Row[],
  actual: readonly Row[],
  mismatches: Mismatch[]
): number {
  const key = keyOf[table]
  const actualByKey = new Map(actual.map(row => [key(row), row]))
  let fields = 0
  for (const row of expected) {
    const found = actualByKey.get(key(row))
    actualByKey.delete(key(row))
    if (!found) {
      mismatches.push({ where: key(row), column: '(row)', expected: 'present', actual: 'missing' })
      continue
    }
    for (const column of CONTENT_COLUMNS[table]) {
      fields++
      if ((row[column] ?? null) !== (found[column] ?? null)) {
        mismatches.push({ where: key(row), column, expected: row[column], actual: found[column] })
      }
    }
  }
  for (const extra of actualByKey.keys()) {
    mismatches.push({ where: extra, column: '(row)', expected: 'absent', actual: 'present' })
  }
  return fields
}

/** mulberry32: a small seeded PRNG, so the sample is reproducible. */
function seededRandom(seed: number): () => number {
  let state = seed >>> 0
  return () => {
    state = (state + 0x6d2b79f5) >>> 0
    let t = state
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4_294_967_296
  }
}

export function sampleSlugs(slugs: readonly string[], size: number, seed: number): string[] {
  const pool = [...slugs]
  const random = seededRandom(seed)
  const count = Math.min(size, pool.length)
  for (let index = 0; index < count; index++) {
    const pick = index + Math.floor(random() * (pool.length - index))
    ;[pool[index], pool[pick]] = [pool[pick]!, pool[index]!]
  }
  return pool.slice(0, count)
}

function table(headers: string[], rows: (string | number)[][]): string {
  const line = (cells: (string | number)[]) =>
    `| ${cells.map(cell => (typeof cell === 'number' ? number(cell) : cell)).join(' | ')} |`
  return [line(headers), line(headers.map(() => '---')), ...rows.map(line)].join('\n')
}

const check = (ok: boolean) => (ok ? 'yes' : '**NO**')

function formatMismatches(mismatches: Mismatch[]): string {
  if (mismatches.length === 0) return ''
  const shown = mismatches
    .slice(0, 25)
    .map(
      m =>
        `- ${m.where} \`${m.column}\`: expected ${JSON.stringify(m.expected)}, got ${JSON.stringify(m.actual)}`
    )
  return `\n\n${shown.join('\n')}${mismatches.length > 25 ? `\n- … ${mismatches.length - 25} more` : ''}`
}

function main(): void {
  const flags = parseFlags(process.argv.slice(2), ['target', 'source', 'sample', 'seed', 'out'])
  const target = resolveTarget(typeof flags.target === 'string' ? flags.target : undefined)
  const sourcePath = resolveSource(flags.source)
  const sampleSize = Number(typeof flags.sample === 'string' ? flags.sample : 200)
  const seed = Number(typeof flags.seed === 'string' ? flags.seed : 9)
  const outPath = resolve(
    process.cwd(),
    typeof flags.out === 'string'
      ? flags.out
      : join(REPO_ROOT, `d1/reports/parity-${target.name}.md`)
  )
  const started = performance.now()

  const sourceText = readFileSync(sourcePath, 'utf8')
  const sourceSha = createHash('sha256').update(sourceText).digest('hex')
  const dataset: ImportDataset = loadDataset(sourcePath)
  const droppedSlugs = new Set(dataset.dropped.map(drop => drop.slug))
  console.log(`Reading every row from ${target.database}…`)
  const snapshot = readSnapshot(target)

  // 1. Row counts.
  const droppedBouts = dataset.dropped.reduce((total, drop) => total + drop.bouts, 0)
  const counts = [
    ['divisions', dataset.divisions.length, 0, dataset.divisions.length, snapshot.divisions.length],
    [
      'boxers',
      dataset.sourceCounts.boxers,
      dataset.dropped.length,
      dataset.boxers.length,
      snapshot.boxers.length
    ],
    ['bouts', dataset.sourceCounts.bouts, droppedBouts, dataset.bouts.length, snapshot.bouts.length]
  ] as const
  const countsOk = counts.every(([, , , expected, actual]) => expected === actual)

  // 2. Slug coverage against today's index.
  const index = JSON.parse(readFileSync(join(PUBLIC_BOXERS, 'index.json'), 'utf8')) as SourceBoxer[]
  const d1Slugs = new Set(snapshot.boxers.map(row => row.slug as string))
  const indexSlugs = new Set(index.map(boxer => boxer.slug))
  const missing = [...indexSlugs].filter(slug => !d1Slugs.has(slug) && !droppedSlugs.has(slug))
  const droppedPresent = [...droppedSlugs].filter(slug => d1Slugs.has(slug))
  const extra = [...d1Slugs].filter(slug => !indexSlugs.has(slug))
  const slugsOk = missing.length === 0 && droppedPresent.length === 0 && extra.length === 0

  // 3. Every row against the mapped source.
  const fullMismatches: Mismatch[] = []
  let fullFields = 0
  for (const name of ['divisions', 'boxers', 'bouts'] as const) {
    fullFields += compareRows(name, dataset[name], snapshot[name], fullMismatches)
  }
  const checksums = (['divisions', 'boxers', 'bouts'] as const).map(name => [
    name,
    rowsChecksum(CONTENT_COLUMNS[name], dataset[name]),
    rowsChecksum(CONTENT_COLUMNS[name], snapshot[name])
  ])

  // 4. Opponent links against today's matching (`getOpponentSlug` reads public/data from cwd).
  process.chdir(APP_DIR)
  const idBySlug = new Map(snapshot.boxers.map(row => [row.slug as string, row.id as number]))
  const todaysOpponent = (name: string) => {
    const slug = getOpponentSlug(name)
    return slug === undefined || droppedSlugs.has(slug) ? null : (idBySlug.get(slug) ?? null)
  }
  const opponentMismatches: Mismatch[] = []
  for (const bout of snapshot.bouts) {
    const expected = todaysOpponent(bout.opponent_name as string)
    if (expected !== bout.opponent_boxer_id) {
      opponentMismatches.push({
        where: keyOf.bouts(bout),
        column: 'opponent_boxer_id',
        expected,
        actual: bout.opponent_boxer_id
      })
    }
  }
  const linked = snapshot.bouts.filter(bout => bout.opponent_boxer_id !== null).length

  // 5. A seeded sample against today's per-boxer JSON files.
  const eligible = index.map(boxer => boxer.slug).filter(slug => !droppedSlugs.has(slug))
  const sample = sampleSlugs(eligible, sampleSize, seed)
  const boxerBySlug = new Map(snapshot.boxers.map(row => [row.slug as string, row]))
  const boutsByBoxer = new Map<number, Row[]>()
  for (const bout of snapshot.bouts) {
    const list = boutsByBoxer.get(bout.boxer_id as number) ?? []
    list.push(bout)
    boutsByBoxer.set(bout.boxer_id as number, list)
  }
  const sampleMismatches: Mismatch[] = []
  let sampleFields = 0
  let sampleBouts = 0
  for (const slug of sample) {
    const record = JSON.parse(
      readFileSync(join(PUBLIC_BOXERS, `${slug}.json`), 'utf8')
    ) as SourceBoxer
    const expectedBoxer = toBoxerRow(record)
    const expectedBouts = (record.bouts ?? []).map((bout, ordinal) =>
      toBoutRow(record.id, ordinal, bout, todaysOpponent(bout.opponentName))
    )
    sampleBouts += expectedBouts.length
    const actualBoxer = boxerBySlug.get(slug)
    sampleFields += compareRows(
      'boxers',
      [expectedBoxer],
      actualBoxer ? [actualBoxer] : [],
      sampleMismatches
    )
    sampleFields += compareRows(
      'bouts',
      expectedBouts,
      boutsByBoxer.get(record.id) ?? [],
      sampleMismatches
    )
  }

  const ok =
    countsOk &&
    slugsOk &&
    fullMismatches.length === 0 &&
    opponentMismatches.length === 0 &&
    sampleMismatches.length === 0 &&
    sample.length >= Math.min(200, eligible.length)

  // 6. The state checksum, every column including ids and `imported_at`: unchanged by a re-run.
  const state = [
    ['divisions', rowsChecksum(DIVISION_COLUMNS, snapshot.divisions)],
    ['boxers', rowsChecksum([...BOXER_COLUMNS, 'imported_at'], snapshot.boxers)],
    ['bouts', rowsChecksum(['id', ...BOUT_COLUMNS], snapshot.bouts)]
  ]
  const q = dataset.quirks
  const report = [
    `# D1 parity report: ${target.name}`,
    '',
    `- **Result: ${ok ? 'PASS' : 'FAIL'}**`,
    `- Target: \`${target.database}\` (\`${target.flags.join(' ')}\`)`,
    `- Source: \`${relative(REPO_ROOT, sourcePath)}\`, ${number(statSync(sourcePath).size)} bytes, sha256 \`${sourceSha.slice(0, 16)}\``,
    `- Generated: ${new Date().toISOString()} by \`pnpm db:parity -- --target ${target.name}\` (sample seed ${seed})`,
    '',
    '## Row counts',
    '',
    table(
      ['Table', 'Source', 'Intentional drops', 'Expected', 'D1', 'Match'],
      counts.map(([name, source, drops, expected, actual]) => [
        name,
        source,
        drops,
        expected,
        actual,
        check(expected === actual)
      ])
    ),
    '',
    '## Intentional removals',
    '',
    dataset.dropped.length === 0
      ? 'None.'
      : table(
          ['Slug', 'BoxRec id', 'Name', 'Bouts', 'Reason'],
          dataset.dropped.map(drop => [
            `\`${drop.slug}\``,
            drop.boxrecId,
            drop.name,
            drop.bouts,
            drop.reason
          ])
        ),
    '',
    'Each removed slug still has a static page today; once pages read from D1 (#10), its URL needs a 404 or a redirect.',
    '',
    '## Slug coverage (`apps/web/public/data/boxers/index.json`)',
    '',
    table(
      ['Check', 'Count'],
      [
        ['Slugs in index.json', indexSlugs.size],
        ['Present in D1', [...indexSlugs].filter(slug => d1Slugs.has(slug)).length],
        ['Intentionally dropped', [...indexSlugs].filter(slug => droppedSlugs.has(slug)).length],
        ['Missing from D1', missing.length],
        ['Dropped but present in D1', droppedPresent.length],
        ['In D1 but not in index.json', extra.length]
      ]
    ),
    missing.length + extra.length > 0
      ? `\nMissing: ${missing.slice(0, 50).join(', ')}\nExtra: ${extra.slice(0, 50).join(', ')}`
      : '',
    '',
    '## Every row, field by field, against the mapped source',
    '',
    `${number(dataset.divisions.length + dataset.boxers.length + dataset.bouts.length)} rows and ${number(fullFields)} fields compared: **${number(fullMismatches.length)} mismatches**.${formatMismatches(fullMismatches)}`,
    '',
    table(
      ['Table', 'Expected content sha256', 'D1 content sha256', 'Match'],
      checksums.map(([name, expected, actual]) => [
        name!,
        `\`${expected!.slice(0, 16)}\``,
        `\`${actual!.slice(0, 16)}\``,
        check(expected === actual)
      ])
    ),
    '',
    'Content checksums cover every column except the database-assigned `boxers.imported_at` and `bouts.id`.',
    '',
    `## Seeded sample against \`public/data/boxers/<slug>.json\``,
    '',
    `${number(sample.length)} boxers (seed ${seed}) with ${number(sampleBouts)} bouts, ${number(sampleFields)} fields compared: **${number(sampleMismatches.length)} mismatches**. Bout opponents are expected from today's \`getOpponentSlug\`.${formatMismatches(sampleMismatches)}`,
    '',
    '<details><summary>Sampled slugs</summary>',
    '',
    sample.join(', '),
    '',
    '</details>',
    '',
    "## Opponent links against today's `getOpponentSlug`",
    '',
    `${number(snapshot.bouts.length)} bouts checked, ${number(linked)} linked to a profile (${number(q.selfLinks)} to the boxer themselves, as today): **${number(opponentMismatches.length)} mismatches**.${formatMismatches(opponentMismatches)}`,
    '',
    '## State checksum',
    '',
    'Every column, including `bouts.id` and `boxers.imported_at`. A second import of the same source must leave it unchanged.',
    '',
    table(
      ['Table', 'sha256'],
      state.map(([name, sha]) => [name!, `\`${sha}\``])
    ),
    '',
    '## Normalization applied',
    '',
    '- An empty string in a nullable text column is `NULL`.',
    '- `promoters`, `trainers` and `managers` are split on newlines into a JSON `string[]` (`[]` when empty).',
    "- `titleFight` is `0`/`1`; each bout's `ordinal` is its position in the source array; `boxerId` becomes the `boxer_id` foreign key.",
    '- `dateOfBirth`, `nicknames`, bout dates and the pipeline timestamps are copied verbatim, not parsed.',
    "- Dropped fields (always `null`, `''` or misparsed in the source): `boxrecWikiUrl` and the ten `amateur*` fields.",
    '',
    '## Source data quirks',
    '',
    table(
      ['Quirk', 'Count', 'Handling'],
      [
        ...Object.entries(q.emptyStringsToNull).map(([field, count]) => [
          `\`${field}\` is \`''\``,
          count,
          'Stored as `NULL`'
        ]),
        ['`dateOfBirth` set (mostly misparsed text)', q.freeTextDatesOfBirth, 'Stored as-is'],
        ['Placeholder avatar (`v6-avatar.svg`)', q.placeholderAvatars, 'Stored as-is'],
        ['Bout lists cut at exactly 100', q.truncatedBoutLists, 'Stored as-is'],
        ['Boxers without bouts', q.boxersWithoutBouts, 'No bout rows'],
        [
          'Bouts listed from both sides',
          q.doubledBouts,
          'One row per side, linked by `opponent_boxer_id`'
        ],
        [
          'Name variants claimed by two boxers',
          q.contestedOpponentNames,
          "Today's rule: the later boxer in index order wins"
        ],
        ['Bouts linked to the boxer themselves', q.selfLinks, 'Kept, as today'],
        ['Staff values with two names', q.multiNameStaffValues, 'Split into a two-name array']
      ]
    ),
    ''
  ].join('\n')

  mkdirSync(dirname(outPath), { recursive: true })
  writeFileSync(outPath, report)
  console.log(report)
  console.log(
    `\nWrote ${relative(REPO_ROOT, outPath)} in ${((performance.now() - started) / 1000).toFixed(1)} s.`
  )
  if (!ok) process.exitCode = 1
}

if (import.meta.filename === resolve(process.argv[1] ?? '')) {
  try {
    main()
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error))
    process.exitCode = 1
  }
}
