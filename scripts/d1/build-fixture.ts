/**
 * Rebuilds the committed local fixture, d1/fixtures/boxers.sample.json: about 50 verbatim source
 * records that cover every division, opponent pairs that link to each other, and the edge cases
 * the importer handles. Deterministic for a given source.
 *
 * Usage: pnpm exec tsx scripts/d1/build-fixture.ts [--source <boxers.json>]
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { join, relative, resolve } from 'node:path'
import {
  DIVISIONS,
  parseFlags,
  prepareDataset,
  type SourceBoxer,
  validateSource
} from '../../packages/data-ops/src/import'
import { resolveSource } from './import-boxers'
import { REPO_ROOT } from './wrangler'

export const FIXTURE_PATH = join(REPO_ROOT, 'd1/fixtures/boxers.sample.json')

const boutCount = (record: SourceBoxer) => record.bouts?.length ?? 0
const bySize = (a: SourceBoxer, b: SourceBoxer) => boutCount(a) - boutCount(b) || a.id - b.id

function main(): void {
  const flags = parseFlags(process.argv.slice(2), ['source'])
  const sourcePath = resolveSource(flags.source)
  const source = validateSource(JSON.parse(readFileSync(sourcePath, 'utf8')))
  const full = prepareDataset(source)
  const byId = new Map(source.map(record => [record.id, record]))
  const chosen = new Set<number>()
  const pick = (record: SourceBoxer | undefined, why: string) => {
    if (!record) throw new Error(`No source record for: ${why}`)
    chosen.add(record.id)
  }

  // Opponent pairs that link to each other, one pair per division, smallest records first.
  const links = new Set(
    full.bouts
      .filter(bout => bout.opponent_boxer_id !== null && bout.opponent_boxer_id !== bout.boxer_id)
      .map(bout => `${bout.boxer_id}>${bout.opponent_boxer_id}`)
  )
  const pairs = [...links]
    .map(link => link.split('>').map(Number) as [number, number])
    .filter(([a, b]) => a < b && links.has(`${b}>${a}`))
    .map(([a, b]) => [byId.get(a)!, byId.get(b)!] as const)
    .sort(
      ([a1, b1], [a2, b2]) =>
        boutCount(a1) + boutCount(b1) - boutCount(a2) - boutCount(b2) || a1.id - a2.id
    )
  for (const division of DIVISIONS) {
    const pair = pairs.find(
      ([a, b]) =>
        (a.proDivision === division.proDivision || b.proDivision === division.proDivision) &&
        !chosen.has(a.id) &&
        !chosen.has(b.id)
    )
    pick(pair?.[0], `a ${division.proDivision} pair`)
    pick(pair?.[1], `a ${division.proDivision} pair`)
  }

  const smallest = (test: (record: SourceBoxer) => boolean) =>
    source.filter(record => test(record) && !chosen.has(record.id)).sort(bySize)[0]
  const hasBouts = (record: SourceBoxer) => boutCount(record) > 0
  /** Adds the smallest matching record, unless a chosen one already covers the case. */
  const ensure = (test: (record: SourceBoxer) => boolean, why: string) => {
    if ([...chosen].some(id => test(byId.get(id)!))) return
    pick(smallest(test), why)
  }
  pick(
    source.find(record => record.slug === 'world'),
    'the junk record'
  )
  ensure(record => record.bouts === null && record.slug !== 'world', 'a boxer with no bouts')
  ensure(record => boutCount(record) === 100, 'a boxer with 100 bouts')
  ensure(record => hasBouts(record) && record.proDivision === '', 'an empty-string proDivision')
  ensure(record => hasBouts(record) && record.proStatus === '', 'an empty-string proStatus')
  ensure(record => hasBouts(record) && record.proDebutDate === '', 'an empty-string proDebutDate')
  ensure(record => record.residence === '', 'an empty-string residence')
  ensure(record => (record.bouts ?? []).some(bout => bout.eventName === ''), 'an empty eventName')
  ensure(record => Boolean(record.managers?.includes('\n')), 'two managers')
  ensure(record => hasBouts(record) && Boolean(record.dateOfBirth), 'a free-text dateOfBirth')
  ensure(record => record.proTotalRounds === null && record.slug !== 'world', 'null rounds')
  ensure(record => hasBouts(record) && Boolean(record.promoters), 'a promoter')
  ensure(record => /v6-avatar\.svg/.test(record.avatarImage ?? ''), 'a placeholder avatar')
  const selfLink = full.bouts.find(bout => bout.opponent_boxer_id === bout.boxer_id)
  pick(byId.get(selfLink?.boxer_id as number), 'a bout linked to the boxer themselves')
  // Fill to 50 with the smallest records that have bouts.
  while (chosen.size < 50) pick(smallest(hasBouts), 'filler')

  const fixture = source.filter(record => chosen.has(record.id))
  writeFileSync(FIXTURE_PATH, `${JSON.stringify(fixture, null, 2)}\n`)
  const seeded = prepareDataset(fixture)
  console.log(
    `Wrote ${relative(REPO_ROOT, FIXTURE_PATH)}: ${fixture.length} records, ` +
      `${seeded.bouts.length} bouts, ${seeded.quirks.opponentLinks} opponent links.`
  )
}

if (import.meta.filename === resolve(process.argv[1] ?? '')) main()
