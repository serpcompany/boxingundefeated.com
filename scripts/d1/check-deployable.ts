/**
 * Refuses a deploy of a D1-reading Worker build (boxer profiles read D1 since #10) unless the
 * target D1 is migrated and holds a complete import. Read-only: it only runs SELECTs, so production
 * takes `--confirm-production`, like the rest of the production run, but doesn't need it.
 *
 * Usage: pnpm db:check-deployable -- --target local|staging|production [--confirm-production]
 *
 * Checks that every migration in d1/drizzle/ is applied, that `dataset_state` records a finished
 * import (a version, not importing), and that boxers and bouts have rows. Run
 * `pnpm db:parity -- --target <t>` as well before the first deploy to an environment.
 */
import { readdirSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { parseFlags, resolveTarget, TARGET_FLAGS } from '../../packages/data-ops/src/import'
import { type D1Target, d1Query, REPO_ROOT } from './wrangler'

/** The problems that make `target` unfit to serve a D1-reading build; empty when it is fit. */
export function deployProblems(target: D1Target): string[] {
  const problems: string[] = []
  const expected = readdirSync(join(REPO_ROOT, 'd1/drizzle'))
    .filter(name => name.endsWith('.sql'))
    .sort()
  let applied: string[]
  try {
    applied = d1Query<{ name: string }>(target, 'SELECT name FROM d1_migrations ORDER BY id').map(
      row => row.name
    )
  } catch {
    return ['no migrations are applied (d1_migrations is missing)']
  }
  const pending = expected.filter(name => !applied.includes(name))
  if (pending.length > 0) return [`migrations not applied: ${pending.join(', ')}`]

  const [state] = d1Query<{ version: string | null; importing: number }>(
    target,
    'SELECT version, importing FROM dataset_state WHERE id = 1'
  )
  if (!state?.version) problems.push('no import has finished (dataset_state has no version)')
  else if (state.importing)
    problems.push(`an import is in progress (last version ${state.version})`)

  const [counts] = d1Query<{ boxers: number; bouts: number }>(
    target,
    'SELECT (SELECT count(*) FROM boxers) AS boxers, (SELECT count(*) FROM bouts) AS bouts'
  )
  if (!counts?.boxers || !counts.bouts) {
    problems.push(
      `boxers or bouts are empty (${counts?.boxers ?? 0} boxers, ${counts?.bouts ?? 0} bouts)`
    )
  }
  return problems
}

function main(): void {
  const flags = parseFlags(process.argv.slice(2), TARGET_FLAGS)
  const target = resolveTarget(flags, { requireConfirmation: false })

  const problems = deployProblems(target)
  if (problems.length > 0) {
    throw new Error(
      `Refusing: ${target.database} can't serve a D1-reading build yet:\n` +
        problems.map(problem => `  - ${problem}`).join('\n')
    )
  }
  console.log(`${target.database} is migrated and holds a complete import: OK to deploy.`)
}

if (import.meta.filename === resolve(process.argv[1] ?? '')) {
  try {
    main()
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error))
    process.exitCode = 1
  }
}
