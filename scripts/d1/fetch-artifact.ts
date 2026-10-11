/**
 * Downloads a pinned boxer data artifact from an environment's R2 bucket and checks its SHA-256
 * against the version (scripts/d1/artifact.ts). `.github/workflows/d1-import.yml` runs it before
 * `db:import` and `db:parity`; locally it fetches a version to import into the local D1.
 *
 * Usage:
 *   pnpm db:fetch-artifact -- --target local|staging|production --version <sha256> [--out <path>]
 *
 * Read-only, so production takes `--confirm-production` but doesn't need it. The file lands at
 * from-pipeline/boxers-<version>.json (gitignored) unless `--out` says otherwise, and only once its
 * checksum matched.
 */
import { mkdirSync } from 'node:fs'
import { dirname, join, relative, resolve } from 'node:path'
import { parseFlags, resolveTarget, TARGET_FLAGS } from '../../packages/data-ops/src/import'
import { ARTIFACT_BUCKETS, artifactKey, checkVersion, fetchArtifact } from './artifact'
import { REPO_ROOT } from './wrangler'

function main(): void {
  const flags = parseFlags(process.argv.slice(2), [...TARGET_FLAGS, 'version', 'out'])
  const target = resolveTarget(flags, { requireConfirmation: false }).name
  const version = checkVersion(flags.version)
  const out = resolve(
    process.cwd(),
    typeof flags.out === 'string'
      ? flags.out
      : join(REPO_ROOT, 'from-pipeline', `boxers-${version}.json`)
  )
  const object = `${ARTIFACT_BUCKETS[target]}/${artifactKey(version)}`

  mkdirSync(dirname(out), { recursive: true })
  const bytes = fetchArtifact(target, version, out)
  if (bytes === null) {
    throw new Error(
      `${object} does not exist. ` +
        (target === 'production'
          ? 'The production job of d1-import.yml copies it from staging.'
          : `Pin it with pnpm db:upload-artifact -- --target ${target}.`)
    )
  }
  console.log(
    `Fetched ${object}: ${bytes.toLocaleString('en-US')} bytes, sha256 matches the version. ` +
      `Saved to ${relative(REPO_ROOT, out).startsWith('..') ? out : relative(REPO_ROOT, out)}.`
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
