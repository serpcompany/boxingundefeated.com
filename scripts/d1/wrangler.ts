import { spawnSync } from 'node:child_process'
import { join, resolve } from 'node:path'
import type { ImportTarget } from '../../packages/data-ops/src/import'

export const REPO_ROOT = resolve(import.meta.dirname, '../..')
/** Wrangler runs here, like the `db:*` scripts: `apps/web/wrangler.jsonc` and its local state. */
export const APP_DIR = join(REPO_ROOT, 'apps/web')
const WRANGLER_BIN = join(REPO_ROOT, 'node_modules/.bin/wrangler')

/** A D1 database and the Wrangler flags that reach it. */
export type D1Target = Pick<ImportTarget, 'database' | 'flags'>

function runWrangler(target: D1Target, args: string[]): string {
  const result = spawnSync(
    WRANGLER_BIN,
    ['d1', 'execute', target.database, ...target.flags, ...args, '--json', '--yes'],
    {
      cwd: APP_DIR,
      encoding: 'utf8',
      env: { ...process.env, WRANGLER_SEND_METRICS: 'false' },
      maxBuffer: 1024 * 1024 * 1024
    }
  )
  if (result.error) throw result.error
  if (result.status !== 0) {
    const output = `${result.stdout ?? ''}\n${result.stderr ?? ''}`.trim()
    throw new Error(`wrangler d1 execute failed (exit ${result.status}):\n${output.slice(-4000)}`)
  }
  return result.stdout
}

interface D1Result<T> {
  results?: T[]
  meta?: { rows_read?: number; rows_written?: number; duration?: number }
}

function parseJson<T>(stdout: string): D1Result<T>[] {
  const start = stdout.indexOf('[')
  if (start === -1) throw new Error(`Expected JSON from wrangler, got:\n${stdout.slice(0, 2000)}`)
  return JSON.parse(stdout.slice(start)) as D1Result<T>[]
}

/** The rows of a single read-only statement. */
export function d1Query<T = Record<string, unknown>>(target: D1Target, sql: string): T[] {
  const results = parseJson<T>(runWrangler(target, ['--command', sql]))
  return results[0]?.results ?? []
}

export interface FileResult {
  rowsRead: number | null
  rowsWritten: number | null
}

/**
 * Applies one SQL file. Locally Wrangler sends it as a single D1 batch (one transaction);
 * remotely it uses D1's import API, which rolls the database back if the file fails.
 */
export function d1ExecuteFile(target: ImportTarget, file: string): FileResult {
  const results = parseJson<Record<string, unknown>>(runWrangler(target, ['--file', file]))
  if (target.name === 'local') return { rowsRead: null, rowsWritten: null }
  const summary = results[0]?.results?.[0] ?? {}
  return {
    rowsRead: Number(summary['Rows read'] ?? Number.NaN),
    rowsWritten: Number(summary['Rows written'] ?? Number.NaN)
  }
}
