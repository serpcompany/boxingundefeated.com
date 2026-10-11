/**
 * The build's identity: the commit it was built from, and the Sentry release `<version>+<commit>`
 * (lib/sentry/options.ts), with the version from apps/web/package.json. next.config.ts bakes the
 * release into the browser bundle during `next build`, and scripts/write-build-environment.ts
 * records it in `.open-next/build-environment.json` for the Worker and the deploy's source-map
 * upload, so the browser, the Worker and the uploaded maps name the same release.
 *
 * Node.js only: build scripts and next.config.ts import it, never the app.
 */
import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { sentryRelease } from '../lib/sentry/options'

/** `GITHUB_SHA` in CI, else `git rev-parse HEAD`, else `unknown`. */
export function buildCommit(): string {
  if (process.env.GITHUB_SHA) return process.env.GITHUB_SHA
  try {
    return execFileSync('git', ['rev-parse', 'HEAD'], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore']
    }).trim()
  } catch {
    return 'unknown'
  }
}

/** apps/web/package.json `version`. */
export function buildVersion(): string {
  const packageJson = path.join(__dirname, '..', 'package.json')
  return String(JSON.parse(readFileSync(packageJson, 'utf8')).version)
}

/** `<version>+<commit>`, or undefined when the commit is unknown. */
export function buildRelease(): string | undefined {
  return sentryRelease(buildVersion(), buildCommit())
}
