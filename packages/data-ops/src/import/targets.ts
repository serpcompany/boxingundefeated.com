export interface ImportTarget {
  name: 'local' | 'staging'
  database: string
  /** Wrangler flags, run from `apps/web` so they use its `wrangler.jsonc` and local state. */
  flags: string[]
}

export const TARGETS: Record<ImportTarget['name'], ImportTarget> = {
  local: { name: 'local', database: 'boxingundefeated-com-local', flags: ['--local'] },
  staging: {
    name: 'staging',
    database: 'boxingundefeated-com-staging',
    flags: ['--remote', '--env', 'staging']
  }
}

export const PRODUCTION_REFUSAL = 'production import runs via the owner/CI'

/** The target must be explicit; production is refused outright. */
export function resolveTarget(value: string | undefined): ImportTarget {
  if (value === 'production')
    throw new Error(`Refusing --target production: ${PRODUCTION_REFUSAL}.`)
  if (value === 'local' || value === 'staging') return TARGETS[value]
  throw new Error(
    value === undefined
      ? 'Missing --target. Pass --target local or --target staging.'
      : `Unknown --target ${JSON.stringify(value)}. Use local or staging.`
  )
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
