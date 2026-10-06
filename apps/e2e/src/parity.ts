/**
 * URL parity: proves a candidate serves every URL the live site serves, at the same URL, with the
 * same title, canonical, H1 and robots meta.
 *
 * Usage, from the repository root:
 *   [EXPECT_ENV=production|staging|local] pnpm parity -- <candidate-origin>
 *     [--reference <origin>] [--concurrency <n>] [--report-dir <dir>]
 *
 * - URLs: every `<loc>` in the reference's sitemaps (from `/sitemap-index.xml`).
 * - Each URL is fetched from the reference (default: the live site) and the candidate without
 *   following redirects. The candidate must answer 200 at the same URL, and its title, canonical,
 *   H1 and robots meta must match the reference's. EXPECT_ENV (default `production`) is the
 *   candidate's configuration: outside production, canonicals use that environment's origin and
 *   every page must be noindex.
 * - Requests to a `*.workers.dev` host carry the smoke-test header.
 * - A 429, a 5xx or a network error is retried with backoff (2, 4, 8 s, or `Retry-After`).
 * - Differences listed in parity-allowlist.ts pass. The report (Markdown and JSON, in
 *   apps/e2e/parity-report/) lists every difference; the exit code is 1 when any is not
 *   allowlisted or a URL could not be checked: the reference didn't answer 200, even after the
 *   retries.
 */
import { mkdirSync, writeFileSync } from 'node:fs'
import { join, relative, resolve } from 'node:path'
import { isNoindex, type PageFacts, pageFacts } from './html'
import { type AllowedDifference, PARITY_ALLOWLIST } from './parity-allowlist'
import {
  type ExpectedEnvironment,
  environmentOrigin,
  isLocalHost,
  PRODUCTION_ORIGIN,
  parseExpectedEnvironment,
  smokeHeadersFor
} from './target'

const REPO_ROOT = resolve(import.meta.dirname, '../../..')
const USER_AGENT = 'boxingundefeated-parity (+https://github.com/serpcompany/boxingundefeated.com)'
const MAX_REMOTE_CONCURRENCY = 8
const ATTEMPTS = 4
const REPORT_ROWS = 200

export const PARITY_FIELDS = ['status', 'title', 'canonical', 'h1', 'robots'] as const
export type ParityField = (typeof PARITY_FIELDS)[number]

export interface Difference {
  path: string
  field: ParityField
  expected: string | null
  actual: string | null
}

export interface Fetched {
  status: number
  location: string | null
  facts: PageFacts | null
  error?: string
  /** Requests made, including retries after a 429, a 5xx or a network error. */
  attempts?: number
}

/** A URL's path and query, percent-encoded the way `fetch` sends it. */
export function normalizePath(path: string): string {
  const url = new URL(path, 'http://parity.invalid')
  return `${url.pathname}${url.search}`
}

const XML_ENTITIES: Record<string, string> = {
  amp: '&',
  apos: "'",
  quot: '"',
  lt: '<',
  gt: '>'
}

/** Every `<loc>`, with XML's entities decoded (`men&apos;s` is `men's`). */
export function sitemapLocations(xml: string): string[] {
  return [...xml.matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/g)].map(match =>
    match[1].replace(/&(amp|apos|quot|lt|gt);/g, (_, name: string) => XML_ENTITIES[name]!)
  )
}

/** The canonical the candidate must have: the reference's, on the candidate's origin. */
export function expectedCanonical(
  reference: string | null,
  environment: ExpectedEnvironment
): string | null {
  if (reference === null || environment === 'production') return reference
  if (reference === PRODUCTION_ORIGIN || reference.startsWith(`${PRODUCTION_ORIGIN}/`)) {
    return `${environmentOrigin(environment)}${reference.slice(PRODUCTION_ORIGIN.length)}`
  }
  return reference
}

function normalizeRobots(robots: string | null): string | null {
  return robots === null ? null : robots.toLowerCase().replace(/\s+/g, '')
}

/** How the candidate's answer for `path` differs from the reference's 200 answer. */
export function compare(
  path: string,
  reference: PageFacts,
  candidate: Fetched,
  environment: ExpectedEnvironment
): Difference[] {
  if (candidate.status !== 200 || !candidate.facts) {
    const actual = candidate.error
      ? `error: ${candidate.error}`
      : `${candidate.status}${candidate.location ? ` -> ${candidate.location}` : ''}`
    return [{ path, field: 'status', expected: '200', actual }]
  }
  const facts = candidate.facts
  const differences: Difference[] = []
  const check = (field: ParityField, expected: string | null, actual: string | null) => {
    if (expected !== actual) differences.push({ path, field, expected, actual })
  }
  check('title', reference.title, facts.title)
  check('canonical', expectedCanonical(reference.canonical, environment), facts.canonical)
  check('h1', reference.h1, facts.h1)
  if (environment === 'production') {
    check('robots', normalizeRobots(reference.robots), normalizeRobots(facts.robots))
  } else if (!isNoindex(facts.robots)) {
    differences.push({ path, field: 'robots', expected: 'noindex', actual: facts.robots })
  }
  return differences
}

export function isAllowed(difference: Difference, allowlist: AllowedDifference[]): boolean {
  return allowlist.some(
    entry =>
      entry.field === difference.field &&
      normalizePath(entry.path) === difference.path &&
      (entry.actual === undefined || entry.actual === difference.actual)
  )
}

export type ReferenceOutcome =
  | { kind: 'compare'; facts: PageFacts }
  | { kind: 'error'; error: string }

/**
 * What the reference's answer means. Only a 200 is compared: its sitemaps list the URL, so
 * anything else (a 404, a 429 or 5xx left after the retries, a 403, a redirect, a network error)
 * leaves the URL unchecked, and the run fails.
 */
export function classifyReference(reference: Fetched): ReferenceOutcome {
  if (reference.status === 200 && reference.facts) {
    return { kind: 'compare', facts: reference.facts }
  }
  const answer = reference.error
    ? `error: ${reference.error}`
    : `${reference.status}${reference.location ? ` -> ${reference.location}` : ''}`
  const after = (reference.attempts ?? 1) > 1 ? ` after ${reference.attempts} attempts` : ''
  return { kind: 'error', error: `reference answered ${answer}${after}` }
}

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

/** Exponential backoff (2, 4, 8 s), or the server's `Retry-After` seconds, up to a minute. */
export function retryDelay(retryAfter: string | null, attempt: number): number {
  const seconds = Number(retryAfter)
  if (retryAfter && Number.isFinite(seconds) && seconds >= 0) return Math.min(seconds, 60) * 1_000
  return 1_000 * 2 ** attempt
}

async function fetchPage(url: string): Promise<Fetched> {
  let lastError = ''
  for (let attempt = 1; attempt <= ATTEMPTS; attempt++) {
    try {
      const response = await fetch(url, {
        redirect: 'manual',
        headers: { 'user-agent': USER_AGENT, ...smokeHeadersFor(url) },
        signal: AbortSignal.timeout(30_000)
      })
      const body = await response.text()
      // A busy or rate-limiting host gets a few more polite tries.
      if ((response.status >= 500 || response.status === 429) && attempt < ATTEMPTS) {
        await sleep(retryDelay(response.headers.get('retry-after'), attempt))
        continue
      }
      return {
        status: response.status,
        location: response.headers.get('location'),
        facts: response.status === 200 ? pageFacts(body) : null,
        attempts: attempt
      }
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error)
      if (attempt < ATTEMPTS) await sleep(retryDelay(null, attempt))
    }
  }
  return { status: 0, location: null, facts: null, error: lastError, attempts: ATTEMPTS }
}

async function fetchText(url: string): Promise<string> {
  const response = await fetch(url, {
    headers: { 'user-agent': USER_AGENT, ...smokeHeadersFor(url) },
    signal: AbortSignal.timeout(30_000)
  })
  if (response.status !== 200) throw new Error(`${url} answered ${response.status}`)
  return response.text()
}

/** Every page `<loc>` reachable from the reference's sitemap index, as paths. */
export async function sitemapPaths(reference: string): Promise<string[]> {
  const visited = new Set<string>()
  const pages = new Set<string>()
  const visit = async (url: string) => {
    if (visited.has(url)) return
    visited.add(url)
    const xml = await fetchText(url)
    const locations = sitemapLocations(xml)
    if (/<sitemapindex\b/i.test(xml)) {
      for (const location of locations) {
        await visit(new URL(new URL(location).pathname, reference).href)
      }
    } else {
      for (const location of locations) {
        const { pathname, search } = new URL(location)
        pages.add(normalizePath(`${pathname}${search}`))
      }
    }
  }
  await visit(`${reference}/sitemap-index.xml`)
  return [...pages]
}

async function forEachLimited<T>(
  items: T[],
  concurrency: number,
  run: (item: T) => Promise<void>
): Promise<void> {
  let next = 0
  await Promise.all(
    Array.from({ length: Math.min(concurrency, items.length) }, async () => {
      while (next < items.length) await run(items[next++])
    })
  )
}

interface Options {
  candidate: string
  reference: string
  concurrency: number
  reportDir: string
  environment: ExpectedEnvironment
}

export function parseOptions(argv: string[], env: NodeJS.ProcessEnv): Options {
  const args = argv.filter(arg => arg !== '--')
  const cwd = env.INIT_CWD ?? process.cwd()
  const flags = new Map<string, string>()
  const positional: string[] = []
  for (let index = 0; index < args.length; index++) {
    const arg = args[index]
    if (!arg.startsWith('--')) {
      positional.push(arg)
      continue
    }
    const [name, inline] = arg.slice(2).split('=', 2)
    const value = inline ?? args[++index]
    if (!['reference', 'concurrency', 'report-dir'].includes(name) || !value) {
      throw new Error(`Unknown option or missing value: ${arg}`)
    }
    flags.set(name, value)
  }
  if (positional.length !== 1) {
    throw new Error('Usage: pnpm parity -- <candidate-origin> [--reference <origin>] [...]')
  }

  const candidate = new URL(positional[0]).origin
  const reference = new URL(flags.get('reference') ?? PRODUCTION_ORIGIN).origin
  let concurrency = Number(flags.get('concurrency') ?? MAX_REMOTE_CONCURRENCY)
  if (!Number.isInteger(concurrency) || concurrency < 1) {
    throw new Error('--concurrency must be a positive integer')
  }
  if (!(isLocalHost(new URL(candidate).hostname) && isLocalHost(new URL(reference).hostname))) {
    concurrency = Math.min(concurrency, MAX_REMOTE_CONCURRENCY)
  }
  return {
    candidate,
    reference,
    concurrency,
    reportDir: flags.has('report-dir')
      ? resolve(cwd, flags.get('report-dir')!)
      : join(REPO_ROOT, 'apps/e2e/parity-report'),
    environment: parseExpectedEnvironment(env.EXPECT_ENV || 'production')
  }
}

function cell(value: string | null): string {
  if (value === null) return '_none_'
  const text = value.length > 120 ? `${value.slice(0, 117)}...` : value
  return `\`${text.replaceAll('|', '\\|').replaceAll('`', "'")}\``
}

function table(rows: Difference[], reasons?: Map<Difference, string>): string[] {
  const header = reasons
    ? ['| URL | Field | Expected | Actual | Reason |', '| --- | --- | --- | --- | --- |']
    : ['| URL | Field | Expected | Actual |', '| --- | --- | --- | --- |']
  const lines = rows.slice(0, REPORT_ROWS).map(row => {
    const cells = [cell(decodeURI(row.path)), row.field, cell(row.expected), cell(row.actual)]
    if (reasons) cells.push(reasons.get(row) ?? '')
    return `| ${cells.join(' | ')} |`
  })
  if (rows.length > REPORT_ROWS) lines.push(`\n… ${rows.length - REPORT_ROWS} more in the JSON.`)
  return [...header, ...lines]
}

async function main() {
  const options = parseOptions(process.argv.slice(2), process.env)
  const started = performance.now()
  const log = (message: string) => console.error(message)

  log(`Reading ${options.reference}/sitemap-index.xml …`)
  const paths = [...new Set(await sitemapPaths(options.reference))].sort()
  if (paths.length === 0) throw new Error('No URLs to check.')
  log(
    `${paths.length} URLs in the sitemaps. ` +
      `Comparing ${options.candidate} with ${options.reference}, EXPECT_ENV=${options.environment}, ` +
      `${options.concurrency} at a time …`
  )

  const differences: Difference[] = []
  const errors: Array<{ path: string; error: string }> = []
  let retries = 0
  let done = 0
  await forEachLimited(paths, options.concurrency, async path => {
    const [reference, candidate] = await Promise.all([
      fetchPage(`${options.reference}${path}`),
      fetchPage(`${options.candidate}${path}`)
    ])
    retries += (reference.attempts ?? 1) - 1 + (candidate.attempts ?? 1) - 1
    const outcome = classifyReference(reference)
    if (outcome.kind === 'compare') {
      differences.push(...compare(path, outcome.facts, candidate, options.environment))
    } else {
      errors.push({ path, error: outcome.error })
    }
    if (++done % 500 === 0) log(`  ${done} / ${paths.length}`)
  })

  differences.sort((a, b) => a.path.localeCompare(b.path) || a.field.localeCompare(b.field))
  const allowed = differences.filter(difference => isAllowed(difference, PARITY_ALLOWLIST))
  const mismatches = differences.filter(difference => !allowed.includes(difference))
  const reasons = new Map(
    allowed.map(difference => [
      difference,
      PARITY_ALLOWLIST.find(entry => isAllowed(difference, [entry]))!.reason
    ])
  )
  const staleEntries = PARITY_ALLOWLIST.filter(
    entry => !allowed.some(difference => isAllowed(difference, [entry]))
  )
  const pass = mismatches.length === 0 && errors.length === 0
  const seconds = ((performance.now() - started) / 1000).toFixed(0)
  const differentUrls = new Set(differences.map(difference => difference.path)).size
  const compared = paths.length - errors.length

  const summary = [
    `- **Result: ${pass ? 'PASS' : 'FAIL'}**`,
    `- Candidate: ${options.candidate} (EXPECT_ENV=${options.environment}); reference: ${options.reference}`,
    `- Run: ${new Date().toISOString()}, ${seconds} s, ${options.concurrency} requests at a time per host`,
    `- URLs: ${paths.length}, from the reference's sitemaps`,
    `- Compared: ${compared}; identical: ${compared - differentUrls}; allowlisted differences: ${allowed.length}; **unexplained mismatches: ${mismatches.length}**`,
    `- **Errors: ${errors.length}**; retried requests: ${retries}; stale allowlist entries: ${staleEntries.length}`,
    '- Fields: status (200 at the same URL, no redirect), title, canonical, H1, robots meta'
  ]
  const markdown = [
    `# URL parity: ${options.candidate}`,
    '',
    ...summary,
    '',
    '## Unexplained mismatches',
    '',
    ...(mismatches.length ? table(mismatches) : ['None.']),
    '',
    '## Allowlisted (`apps/e2e/src/parity-allowlist.ts`)',
    '',
    ...(allowed.length ? table(allowed, reasons) : ['None.']),
    ...(staleEntries.length
      ? ['', '## Stale allowlist entries', '', ...staleEntries.map(e => `- ${e.path} (${e.field})`)]
      : []),
    ...(errors.length
      ? ['', '## Errors', '', ...errors.map(entry => `- ${entry.path}: ${entry.error}`)]
      : []),
    ''
  ].join('\n')

  mkdirSync(options.reportDir, { recursive: true })
  const name = `parity-${new URL(options.candidate).host.replace(/[^a-z0-9.-]/gi, '-')}`
  const markdownPath = join(options.reportDir, `${name}.md`)
  writeFileSync(markdownPath, markdown)
  writeFileSync(
    join(options.reportDir, `${name}.json`),
    `${JSON.stringify({ ...options, pass, paths: paths.length, mismatches, allowed, staleEntries, errors }, null, 2)}\n`
  )
  console.log(summary.join('\n'))
  console.log(`Report: ${relative(process.env.INIT_CWD ?? process.cwd(), markdownPath)}`)
  if (!pass) {
    for (const mismatch of mismatches.slice(0, 20)) {
      console.log(
        `  ${decodeURI(mismatch.path)} ${mismatch.field}: ${mismatch.expected} != ${mismatch.actual}`
      )
    }
    process.exit(1)
  }
}

if (process.argv[1] && resolve(process.argv[1]) === import.meta.filename) {
  main().catch(error => {
    console.error(error instanceof Error ? error.message : error)
    process.exit(1)
  })
}
