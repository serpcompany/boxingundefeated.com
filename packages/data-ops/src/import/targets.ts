import { isAbsolute, relative, resolve } from 'node:path'

export interface ImportTarget {
  name: 'local' | 'staging' | 'production'
  database: string
  /** Wrangler flags, run from `apps/web` so they use its `wrangler.jsonc` and local state. */
  flags: string[]
}

/** The databases and flags of `apps/web/wrangler.jsonc` and the `db:migrate:*` scripts. */
export const TARGETS: Record<ImportTarget['name'], ImportTarget> = {
  local: { name: 'local', database: 'boxingundefeated-com-local', flags: ['--local'] },
  staging: {
    name: 'staging',
    database: 'boxingundefeated-com-staging',
    flags: ['--remote', '--env', 'staging']
  },
  production: {
    name: 'production',
    database: 'boxingundefeated-com-production',
    flags: ['--remote', '--env', 'production']
  }
}

/** The flags `resolveTarget` reads, which `db:import`, `db:parity` and `db:check-deployable` accept. */
export const TARGET_FLAGS = ['target', 'confirm-production'] as const

/** The flags `db:import` (scripts/d1/import-boxers.ts) accepts. */
export const IMPORT_FLAGS = [
  ...TARGET_FLAGS,
  'source',
  'out-dir',
  'allow-prune',
  'allow-small-source',
  'dry-run'
] as const

/** Whether a flag that takes no value was passed; `--name=value` or `--name value` is refused. */
export function bareFlag(flags: Readonly<Record<string, string | true>>, name: string): boolean {
  const value = flags[name]
  if (value !== undefined && value !== true) throw new Error(`--${name} takes no value.`)
  return value === true
}

/**
 * The target must be explicit. Production also needs `--confirm-production`, which records the
 * owner's approval of that one run (AGENTS.md, D1); it is not an approval itself. A read-only
 * check passes `requireConfirmation: false`, so it takes the flag but doesn't need it.
 */
export function resolveTarget(
  flags: Readonly<Record<string, string | true>>,
  { requireConfirmation = true }: { requireConfirmation?: boolean } = {}
): ImportTarget {
  const value = flags.target
  const confirmed = bareFlag(flags, 'confirm-production')
  if (typeof value !== 'string') {
    throw new Error('Missing --target. Pass --target local, staging or production.')
  }
  if (!Object.hasOwn(TARGETS, value)) {
    throw new Error(`Unknown --target ${JSON.stringify(value)}. Use local, staging or production.`)
  }
  const target = TARGETS[value as ImportTarget['name']]
  if (target.name === 'production' && !confirmed && requireConfirmation) {
    throw new Error(
      'Refusing --target production without --confirm-production. Pass it only for a ' +
        'production run the owner has approved in writing.'
    )
  }
  if (target.name !== 'production' && confirmed) {
    throw new Error('--confirm-production only goes with --target production.')
  }
  return target
}

/**
 * `--name value` and `--name=value` flags; a bare `--` (from `pnpm run x -- …`) is ignored. A
 * repeated flag is refused, so arguments appended to a script can't override its own, such as
 * `db:seed:local`'s `--target local`.
 */
export function parseFlags(argv: readonly string[], allowed: readonly string[]) {
  const flags: Record<string, string | true> = {}
  for (let index = 0; index < argv.length; index++) {
    const argument = argv[index]!
    if (argument === '--') continue
    const match = /^--([a-z-]+)(?:=(.*))?$/.exec(argument)
    const name = match?.[1]
    if (!match || !name || !allowed.includes(name)) {
      throw new Error(
        `Unknown argument ${argument}. Allowed: ${allowed.map(a => `--${a}`).join(', ')}`
      )
    }
    if (Object.hasOwn(flags, name)) throw new Error(`--${name} is given twice.`)
    const next = argv[index + 1]
    if (match[2] !== undefined) flags[name] = match[2]
    else if (next !== undefined && !next.startsWith('--')) {
      flags[name] = next
      index++
    } else flags[name] = true
  }
  return flags
}

/** A production source must hold at least this share of the boxers production D1 holds now. */
export const PRODUCTION_MIN_SOURCE_SHARE = 0.95
/** And at least this many boxers, so an empty or wiped production D1 sets no floor of 0. */
export const PRODUCTION_MIN_SOURCE_BOXERS = 5_000

/**
 * A production import reads only an explicit `--source` (not `$BOXERS_SOURCE` or the default),
 * and never one under `d1/fixtures/`, which is test data.
 */
export function checkProductionSourcePath(path: string | undefined, repoRoot: string): void {
  if (path === undefined) {
    throw new Error(
      'A production import needs an explicit --source; $BOXERS_SOURCE and the default path ' +
        'are not used for production.'
    )
  }
  if (isWithin(resolve(repoRoot, 'd1/fixtures'), resolve(path))) {
    throw new Error(`Refusing --source ${path} for production: d1/fixtures/ is test data.`)
  }
}

/**
 * Refuses a production source with under 95 % of `liveBoxers`, the boxers in production D1 before
 * the import, or under `PRODUCTION_MIN_SOURCE_BOXERS`, which looks truncated, unless
 * `--allow-small-source`.
 */
export function checkProductionSourceSize(
  boxers: number,
  liveBoxers: number,
  allowSmall = false
): void {
  const floor = Math.max(
    Math.ceil(liveBoxers * PRODUCTION_MIN_SOURCE_SHARE),
    PRODUCTION_MIN_SOURCE_BOXERS
  )
  if (boxers >= floor || allowSmall) return
  throw new Error(
    `Refusing a production import of ${boxers} boxers: production D1 holds ${liveBoxers}, so ` +
      `fewer than ${floor} looks truncated. If it is intended, re-run with --allow-small-source.`
  )
}

/** The SQL files the importer writes, and the only files it ever deletes. */
export const GENERATED_SQL_FILE = /^\d{4}(-prune)?\.sql$/

function isWithin(parent: string, child: string): boolean {
  const path = relative(parent, child)
  return path === '' || (!path.startsWith('..') && !isAbsolute(path))
}

/** Refuses an output directory that is, is inside or contains `d1/drizzle`, the migrations. */
export function checkOutDir(outDir: string, repoRoot: string): void {
  const migrations = resolve(repoRoot, 'd1/drizzle')
  const target = resolve(outDir)
  if (isWithin(migrations, target) || isWithin(target, migrations)) {
    throw new Error(`Refusing --out-dir ${outDir}: it would mix import SQL with d1/drizzle.`)
  }
}
