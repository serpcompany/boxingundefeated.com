/**
 * Refuses a deploy of a D1-reading Worker build (every boxer page reads D1, since #10 and #11)
 * unless the target D1 is migrated and holds a complete import. Read-only: it only runs SELECTs,
 * so production takes `--confirm-production`, like the rest of the production run, but doesn't
 * need it.
 *
 * Usage: pnpm db:check-deployable -- --target local|staging|production [--confirm-production]
 *                                   [--migrations-only]
 *
 * Checks that every migration in d1/drizzle/ is applied, that `dataset_state` records a finished
 * import (a version, not importing), and that boxers and bouts have rows. Run
 * `pnpm db:parity -- --target <t>` as well before the first deploy to an environment.
 * `--migrations-only` checks just the migrations: d1-import.yml runs it before an import, which
 * needs this commit's schema.
 */
import { readdirSync } from 'node:fs'
import { join, resolve } from 'node:path'
import {
  bareFlag,
  parseFlags,
  resolveTarget,
  TARGET_FLAGS
} from '../../packages/data-ops/src/import'
import { type D1Target, d1Query, REPO_ROOT } from './wrangler'

/** Why `target` lacks a migration in d1/drizzle/; empty when every one is applied. */
export function migrationProblems(target: D1Target): string[] {
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
  return pending.length > 0 ? [`migrations not applied: ${pending.join(', ')}`] : []
}

/** The problems that make `target` unfit to serve a D1-reading build; empty when it is fit. */
export function deployProblems(target: D1Target): string[] {
  const problems = migrationProblems(target)
  if (problems.length > 0) return problems

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
  const flags = parseFlags(process.argv.slice(2), [...TARGET_FLAGS, 'migrations-only'])
  const target = resolveTarget(flags, { requireConfirmation: false })
  const migrationsOnly = bareFlag(flags, 'migrations-only')

  const problems = migrationsOnly ? migrationProblems(target) : deployProblems(target)
  if (problems.length > 0) {
    throw new Error(
      `Refusing: ${target.database} can't ${migrationsOnly ? 'take an import' : 'serve a D1-reading build'} yet:\n` +
        problems.map(problem => `  - ${problem}`).join('\n')
    )
  }
  console.log(
    migrationsOnly
      ? `${target.database} has every migration applied: OK to import.`
      : `${target.database} is migrated and holds a complete import: OK to deploy.`
  )
}

if (import.meta.filename === resolve(process.argv[1] ?? '')) {
  try {
    main()
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error))
    process.exitCode = 1
  }
}
