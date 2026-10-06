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

/** The flags `resolveTarget` reads, which `db:import` and `db:parity` accept. */
export const TARGET_FLAGS = ['target', 'confirm-production'] as const

/**
 * The target must be explicit. Production also needs `--confirm-production`, which is passed only
 * for a production run the owner has approved (AGENTS.md, D1).
 */
export function resolveTarget(flags: Readonly<Record<string, string | true>>): ImportTarget {
  const value = flags.target
  const confirmed = flags['confirm-production']
  if (confirmed !== undefined && confirmed !== true) {
    throw new Error('--confirm-production takes no value.')
  }
  if (typeof value !== 'string') {
    throw new Error('Missing --target. Pass --target local, staging or production.')
  }
  if (!Object.hasOwn(TARGETS, value)) {
    throw new Error(`Unknown --target ${JSON.stringify(value)}. Use local, staging or production.`)
  }
  const target = TARGETS[value as ImportTarget['name']]
  if (target.name === 'production' && !confirmed) {
    throw new Error(
      'Refusing --target production without --confirm-production. Pass it only for a ' +
        'production run the owner has approved.'
    )
  }
  if (target.name !== 'production' && confirmed) {
    throw new Error('--confirm-production only goes with --target production.')
  }
  return target
}

/** `--name value` and `--name=value` flags; a bare `--` (from `pnpm run x -- …`) is ignored. */
export function parseFlags(argv: readonly string[], allowed: readonly string[]) {
  const flags: Record<string, string | true> = {}
  for (let index = 0; index < argv.length; index++) {
    const argument = argv[index]!
    if (argument === '--') continue
    const match = /^--([a-z-]+)(?:=(.*))?$/.exec(argument)
    if (!match || !allowed.includes(match[1]!)) {
      throw new Error(
        `Unknown argument ${argument}. Allowed: ${allowed.map(a => `--${a}`).join(', ')}`
      )
    }
    const next = argv[index + 1]
    if (match[2] !== undefined) flags[match[1]!] = match[2]
    else if (next !== undefined && !next.startsWith('--')) {
      flags[match[1]!] = next
      index++
    } else flags[match[1]!] = true
  }
  return flags
}

/** The SQL files the importer writes, and the only files it ever deletes. */
export const GENERATED_SQL_FILE = /^\d{4}(-prune)?\.sql$/

/** Refuses an output directory that is, is inside or contains `d1/drizzle`, the migrations. */
export function checkOutDir(outDir: string, repoRoot: string): void {
  const migrations = resolve(repoRoot, 'd1/drizzle')
  const target = resolve(outDir)
  const within = (parent: string, child: string) => {
    const path = relative(parent, child)
    return path === '' || (!path.startsWith('..') && !isAbsolute(path))
  }
  if (within(migrations, target) || within(target, migrations)) {
    throw new Error(`Refusing --out-dir ${outDir}: it would mix import SQL with d1/drizzle.`)
  }
}
