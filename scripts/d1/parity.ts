/**
 * Proves a D1 import lost nothing, independently of the importer's mapping: every boxer and bout
 * in D1 is compared field by field with the source JSON and with today's per-boxer JSON
 * (`apps/web/public/data/boxers/<slug>.json`, what the live site renders), using the parity
 * rules in `packages/data-ops/src/parity/rules.ts`. Opponent links are checked against today's
 * `getOpponentSlug` and divisions against today's `getBoxerCategories`. Writes a Markdown report
 * and exits 1 on any mismatch.
 *
 * Usage:
 *   pnpm db:parity -- --target local|staging [--source <boxers.json>]
 *                     [--out d1/reports/parity-<target>.md]
 */
import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import { dirname, join, relative, resolve } from 'node:path'
import { getBoxerCategories } from '../../apps/web/lib/boxers-loader'
import { getOpponentSlug } from '../../apps/web/lib/opponent-mapper'
import {
  BOUT_COLUMNS,
  BOXER_COLUMNS,
  DIVISION_COLUMNS,
  type ImportDataset,
  type ImportTarget,
  parseFlags,
  resolveTarget,
  rowsChecksum
} from '../../packages/data-ops/src/import'
import {
  compareBoxerRecord,
  type D1Row,
  type Mismatch,
  unaccountedColumns
} from '../../packages/data-ops/src/parity/rules'
import { loadDataset, resolveSource } from './import-boxers'
import { APP_DIR, d1Query, REPO_ROOT } from './wrangler'

const PUBLIC_BOXERS = join(APP_DIR, 'public/data/boxers')
const BOXER_PAGE = 1_000
const BOUT_PAGE = 10_000
const number = (value: number) => value.toLocaleString('en-US')

interface Snapshot {
  divisions: D1Row[]
  boxers: D1Row[]
  bouts: D1Row[]
}

/** Every row, in key order, paged so no single D1 response is large. */
function readSnapshot(target: ImportTarget): Snapshot {
  const divisions = d1Query<D1Row>(target, 'SELECT * FROM divisions ORDER BY sort_order')
  const boxers: D1Row[] = []
  for (let last = 0; ; ) {
    const page = d1Query<D1Row>(
      target,
      `SELECT * FROM boxers WHERE id > ${last} ORDER BY id LIMIT ${BOXER_PAGE}`
    )
    boxers.push(...page)
    if (page.length < BOXER_PAGE) break
    last = page.at(-1)!.id as number
  }
  const bouts: D1Row[] = []
  for (let boxer = 0, ordinal = -1; ; ) {
    const page = d1Query<D1Row>(
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

interface Comparison {
  boxers: number
  bouts: number
  fields: number
  mismatches: Mismatch[]
}

/** Compares each JSON record with its D1 rows (found by slug), plus D1 rows no record claims. */
function compareRecords(
  records: readonly Record<string, unknown>[],
  snapshot: Snapshot,
  opponentId: (name: string) => number | null
): Comparison {
  const boxerBySlug = new Map(snapshot.boxers.map(row => [row.slug as string, row]))
  const boutsByBoxer = new Map<number, D1Row[]>()
  for (const bout of snapshot.bouts) {
    const list = boutsByBoxer.get(bout.boxer_id as number) ?? []
    list.push(bout)
    boutsByBoxer.set(bout.boxer_id as number, list)
  }
  const result: Comparison = { boxers: 0, bouts: 0, fields: 0, mismatches: [] }
  const claimed = new Set<number>()
  for (const record of records) {
    const boxer = boxerBySlug.get(record.slug as string)
    if (boxer) claimed.add(boxer.id as number)
    const own = boxer ? (boutsByBoxer.get(boxer.id as number) ?? []) : []
    const compared = compareBoxerRecord(record, boxer, own, opponentId)
    result.boxers++
    result.bouts += compared.bouts
    result.fields += compared.fields
    result.mismatches.push(...compared.mismatches)
  }
  for (const boxer of snapshot.boxers) {
    if (!claimed.has(boxer.id as number)) {
      result.mismatches.push({
        where: `boxer ${boxer.id} (${boxer.slug})`,
        field: '(row)',
        expected: 'absent',
        actual: 'present'
      })
    }
  }
  for (const [boxerId, bouts] of boutsByBoxer) {
    if (!claimed.has(boxerId) && !snapshot.boxers.some(row => row.id === boxerId)) {
      result.mismatches.push({
        where: `bouts of boxer ${boxerId}`,
        field: '(row)',
        expected: 'absent',
        actual: `${bouts.length} orphan rows`
      })
    }
  }
  return result
}

function table(headers: string[], rows: (string | number)[][]): string {
  const line = (cells: (string | number)[]) =>
    `| ${cells.map(cell => (typeof cell === 'number' ? number(cell) : cell)).join(' | ')} |`
  return [line(headers), line(headers.map(() => '---')), ...rows.map(line)].join('\n')
}

const check = (ok: boolean) => (ok ? 'yes' : '**NO**')

function formatMismatches(mismatches: readonly Mismatch[]): string {
  if (mismatches.length === 0) return ''
  const shown = mismatches
    .slice(0, 25)
    .map(
      m =>
        `- ${m.where} \`${m.field}\`: expected ${JSON.stringify(m.expected)}, got ${JSON.stringify(m.actual)}`
    )
  return `\n\n${shown.join('\n')}${mismatches.length > 25 ? `\n- … ${mismatches.length - 25} more` : ''}`
}

function summary(name: string, comparison: Comparison): string {
  return (
    `${number(comparison.boxers)} ${name} and ${number(comparison.bouts)} bouts, ` +
    `${number(comparison.fields)} fields compared: ` +
    `**${number(comparison.mismatches.length)} mismatches**.${formatMismatches(comparison.mismatches)}`
  )
}

function main(): void {
  const flags = parseFlags(process.argv.slice(2), ['target', 'source', 'out'])
  const target = resolveTarget(typeof flags.target === 'string' ? flags.target : undefined)
  const sourcePath = resolveSource(flags.source)
  const outPath = resolve(
    process.cwd(),
    typeof flags.out === 'string'
      ? flags.out
      : join(REPO_ROOT, `d1/reports/parity-${target.name}.md`)
  )
  const started = performance.now()

  const sourceText = readFileSync(sourcePath, 'utf8')
  const sourceSha = createHash('sha256').update(sourceText).digest('hex')
  const source = JSON.parse(sourceText) as Record<string, unknown>[]
  // The importer's dataset only supplies the intentional drops and the quirk counts.
  const dataset: ImportDataset = loadDataset(sourcePath)
  const droppedSlugs = new Set(dataset.dropped.map(drop => drop.slug))
  const records = source.filter(record => !droppedSlugs.has(record.slug as string))
  console.log(`Reading every row from ${target.database}…`)
  const snapshot = readSnapshot(target)

  // 1. Row counts, straight from the source JSON.
  const boutCount = (list: readonly Record<string, unknown>[]) =>
    list.reduce((total, record) => total + ((record.bouts as unknown[] | null)?.length ?? 0), 0)
  const categories = getBoxerCategories()
  const counts = [
    ['divisions', categories.length, 0, categories.length, snapshot.divisions.length],
    [
      'boxers',
      source.length,
      source.length - records.length,
      records.length,
      snapshot.boxers.length
    ],
    [
      'bouts',
      boutCount(source),
      boutCount(source) - boutCount(records),
      boutCount(records),
      snapshot.bouts.length
    ]
  ] as const
  const countsOk = counts.every(([, , , expected, actual]) => expected === actual)

  // 2. Slug coverage against today's index.
  const index = JSON.parse(readFileSync(join(PUBLIC_BOXERS, 'index.json'), 'utf8')) as {
    slug: string
  }[]
  const d1Slugs = new Set(snapshot.boxers.map(row => row.slug as string))
  const indexSlugs = new Set(index.map(boxer => boxer.slug))
  const missing = [...indexSlugs].filter(slug => !d1Slugs.has(slug) && !droppedSlugs.has(slug))
  const droppedPresent = [...droppedSlugs].filter(slug => d1Slugs.has(slug))
  const extra = [...d1Slugs].filter(slug => !indexSlugs.has(slug))
  const slugsOk = missing.length === 0 && droppedPresent.length === 0 && extra.length === 0

  // 3. Divisions against today's `getBoxerCategories()`, and every source division among them.
  const divisionMismatches: Mismatch[] = []
  categories.forEach((category, sortOrder) => {
    const row = snapshot.divisions.find(division => division.slug === category.slug)
    const expected = { name: category.name, pro_division: category.division, sort_order: sortOrder }
    for (const [field, value] of Object.entries(expected)) {
      if (row?.[field] !== value) {
        divisionMismatches.push({
          where: category.slug,
          field,
          expected: value,
          actual: row?.[field]
        })
      }
    }
  })
  const divisionValues = new Set(categories.map(category => category.division))
  for (const record of records) {
    const division = record.proDivision as string | null
    if (division && !divisionValues.has(division)) {
      divisionMismatches.push({
        where: `boxer ${record.id} (${record.slug})`,
        field: 'proDivision',
        expected: 'one of the 17 divisions',
        actual: division
      })
    }
  }

  // 4 and 5. Every boxer and bout, against the source and against today's per-boxer JSON.
  // Opponents are expected where today's `getOpponentSlug` (reading public/data from the cwd)
  // links them, unless that boxer was dropped.
  process.chdir(APP_DIR)
  const idBySlug = new Map(snapshot.boxers.map(row => [row.slug as string, row.id as number]))
  const todaysOpponent = (name: string) => {
    const slug = getOpponentSlug(name)
    return slug === undefined || droppedSlugs.has(slug) ? null : (idBySlug.get(slug) ?? null)
  }
  const againstSource = compareRecords(records, snapshot, todaysOpponent)
  const siteRecords: Record<string, unknown>[] = []
  const missingFiles: Mismatch[] = []
  for (const record of records) {
    const file = join(PUBLIC_BOXERS, `${record.slug as string}.json`)
    if (existsSync(file)) siteRecords.push(JSON.parse(readFileSync(file, 'utf8')))
    else
      missingFiles.push({
        where: String(record.slug),
        field: '(file)',
        expected: file,
        actual: 'missing'
      })
  }
  const againstSite = compareRecords(siteRecords, snapshot, todaysOpponent)
  againstSite.mismatches.unshift(...missingFiles)

  // 6. Every D1 column is accounted for by a JSON key or a derived column.
  const unaccounted = [
    ...(snapshot.boxers[0] ? unaccountedColumns('boxers', snapshot.boxers[0]) : []),
    ...(snapshot.bouts[0] ? unaccountedColumns('bouts', snapshot.bouts[0]) : [])
  ]
  const linked = snapshot.bouts.filter(bout => bout.opponent_boxer_id !== null).length
  const selfLinked = snapshot.bouts.filter(bout => bout.opponent_boxer_id === bout.boxer_id).length

  const ok =
    countsOk &&
    slugsOk &&
    divisionMismatches.length === 0 &&
    againstSource.mismatches.length === 0 &&
    againstSite.mismatches.length === 0 &&
    unaccounted.length === 0

  // 7. Checksums of what D1 holds, to compare environments and runs.
  const content = [
    ['divisions', rowsChecksum(DIVISION_COLUMNS, snapshot.divisions)],
    ['boxers', rowsChecksum(BOXER_COLUMNS, snapshot.boxers)],
    ['bouts', rowsChecksum(BOUT_COLUMNS, snapshot.bouts)]
  ]
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
    `- Generated: ${new Date().toISOString()} by \`pnpm db:parity -- --target ${target.name}\``,
    '- Method: D1 rows are read back and compared with the JSON by the parity rules ' +
      '(`packages/data-ops/src/parity/rules.ts`), which are written separately from the ' +
      "importer's mapping, so a mapping mistake shows up here.",
    '',
    '## Row counts',
    '',
    table(
      ['Table', 'Source', 'Intentional drops', 'Expected', 'D1', 'Match'],
      counts.map(([name, sourceCount, drops, expected, actual]) => [
        name,
        sourceCount,
        drops,
        expected,
        actual,
        check(expected === actual)
      ])
    ),
    '',
    'Divisions are expected from `getBoxerCategories()` (`apps/web/lib/boxers-loader.ts`).',
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
    '## Divisions against `getBoxerCategories()`',
    '',
    `${number(snapshot.divisions.length)} divisions: slug, name, \`pro_division\` and order, and every source \`proDivision\` among them: **${number(divisionMismatches.length)} mismatches**.${formatMismatches(divisionMismatches)}`,
    '',
    '## Every boxer and bout against the source JSON',
    '',
    summary('boxers', againstSource),
    '',
    `## Every boxer and bout against \`public/data/boxers/<slug>.json\``,
    '',
    `What the live site renders today. ${summary('boxers', againstSite)}`,
    '',
    'Both comparisons check every JSON key: each mapped key against its column by its rule ' +
      '(the same value; `""` or `null` as `NULL`; newline-separated names as a JSON array; ' +
      '`true`/`false` as `1`/`0`), and each unstored key against the documented drops ' +
      "(`boxrecWikiUrl`, the ten `amateur*` fields, a bout's `boxerId`, checked against the " +
      "boxer's `boxrecId`). A key in neither list is a mismatch. Each bout is matched by its " +
      'position in the list (`ordinal`), and its `opponent_boxer_id` must be the profile that ' +
      "today's `getOpponentSlug` links." +
      (unaccounted.length > 0
        ? `\n\n**D1 columns that no JSON key accounts for: ${unaccounted.join(', ')}.**`
        : ' Every D1 column is accounted for.'),
    '',
    '## Opponent links',
    '',
    `${number(linked)} of ${number(snapshot.bouts.length)} bouts link to a profile (${number(selfLinked)} to the boxer themselves, as today). Mismatches against \`getOpponentSlug\` are counted above, under \`opponent_boxer_id\`.`,
    '',
    '## Checksums',
    '',
    'Content: every column except the database-assigned `boxers.imported_at` and `bouts.id`, to compare environments. State: every column, including those two. A re-import of the same source must leave the state unchanged.',
    '',
    table(
      ['Table', 'Content sha256', 'State sha256'],
      content.map(([name, sha], i) => [name!, `\`${sha!.slice(0, 16)}\``, `\`${state[i]![1]}\``])
    ),
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
