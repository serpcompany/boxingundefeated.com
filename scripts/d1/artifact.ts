/**
 * The boxer data artifact pinned in R2 (#63): the pipeline's `boxers.json`, stored once per
 * version at `boxers/<version>.json` in each environment's data bucket and never overwritten. The
 * version is the file's SHA-256, so every key names its own checksum, and every read checks it.
 *
 * - local: `boxingundefeated-com-data-local`, in Wrangler's local state (`apps/web/.wrangler`).
 * - staging: `boxingundefeated-com-data-staging`. `pnpm db:upload-artifact` pins new versions here.
 * - production: `boxingundefeated-com-data-production`. Only the production job of
 *   `.github/workflows/d1-import.yml` writes it, copying a version staging imported.
 *
 * The buckets are private and bound to no Worker: only these scripts read them, through Wrangler
 * (the local login, or CLOUDFLARE_API_TOKEN in CI).
 */
import { spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { existsSync, readFileSync, renameSync, rmSync, statSync } from 'node:fs'
import type { ImportTarget } from '../../packages/data-ops/src/import'
import { APP_DIR, WRANGLER_BIN } from './wrangler'

export const ARTIFACT_BUCKETS: Record<ImportTarget['name'], string> = {
  local: 'boxingundefeated-com-data-local',
  staging: 'boxingundefeated-com-data-staging',
  production: 'boxingundefeated-com-data-production'
}

/** A version is the artifact's SHA-256, as 64 lowercase hex digits. */
export function checkVersion(value: string | true | undefined): string {
  if (typeof value !== 'string' || !/^[0-9a-f]{64}$/.test(value)) {
    throw new Error('--version takes the artifact version: its SHA-256, 64 lowercase hex digits.')
  }
  return value
}

export const artifactKey = (version: string) => `boxers/${version}.json`

export function sha256File(path: string): string {
  return createHash('sha256').update(readFileSync(path)).digest('hex')
}

function r2(target: ImportTarget['name'], args: string[]): void {
  const result = spawnSync(
    WRANGLER_BIN,
    ['r2', 'object', ...args, target === 'local' ? '--local' : '--remote'],
    {
      cwd: APP_DIR,
      encoding: 'utf8',
      env: { ...process.env, WRANGLER_SEND_METRICS: 'false' }
    }
  )
  if (result.error) throw result.error
  if (result.status !== 0) {
    const output = `${result.stdout ?? ''}\n${result.stderr ?? ''}`.trim()
    const error = new Error(
      `wrangler r2 object ${args[0]} failed (exit ${result.status}):\n${output}`
    )
    if (output.includes('The specified key does not exist')) error.name = 'NoSuchKey'
    throw error
  }
}

/**
 * Downloads `boxers/<version>.json` from the target's bucket to `file` and checks its SHA-256. It
 * returns the size, or null when the bucket has no such key. Nothing is left at `file` unless the
 * checksum matched.
 */
export function fetchArtifact(
  target: ImportTarget['name'],
  version: string,
  file: string
): number | null {
  const part = `${file}.part`
  rmSync(part, { force: true })
  try {
    r2(target, ['get', `${ARTIFACT_BUCKETS[target]}/${artifactKey(version)}`, '--file', part])
  } catch (error) {
    rmSync(part, { force: true })
    if (error instanceof Error && error.name === 'NoSuchKey') return null
    throw error
  }
  if (!existsSync(part)) throw new Error(`Wrangler reported success but wrote no ${part}.`)
  const actual = sha256File(part)
  if (actual !== version) {
    rmSync(part, { force: true })
    throw new Error(
      `${ARTIFACT_BUCKETS[target]}/${artifactKey(version)} has sha256 ${actual}, not ${version}. ` +
        'The bucket holds other content under this version; nothing was used.'
    )
  }
  renameSync(part, file)
  return statSync(file).size
}

/** Uploads `file` as `boxers/<version>.json`; the caller has checked the key is free. */
export function putArtifact(target: ImportTarget['name'], version: string, file: string): void {
  r2(target, [
    'put',
    `${ARTIFACT_BUCKETS[target]}/${artifactKey(version)}`,
    '--file',
    file,
    '--content-type',
    'application/json'
  ])
}
