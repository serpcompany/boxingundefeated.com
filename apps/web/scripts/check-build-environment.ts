/**
 * Refuses to deploy or serve a Worker build under another environment than the one it was built
 * for: compares `.open-next/build-environment.json` (scripts/write-build-environment.ts) with the
 * `SITE_ENVIRONMENT` var that wrangler.jsonc gives the target. worker.ts makes the same check on
 * every request and answers 503 on a mismatch (lib/worker/build-environment.ts); this catches it
 * before the deploy.
 *
 * Usage: pnpm --filter web check:build-environment [staging|production]
 * Without an environment it checks the local top level, which `serve:worker` uses.
 */
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { unstable_readConfig } from 'wrangler'
import { buildEnvironmentMismatch } from '../lib/worker/build-environment'

const BUILD_ENVIRONMENT_FILE = path.join(__dirname, '..', '.open-next', 'build-environment.json')
const WRANGLER_CONFIG = path.join(__dirname, '..', 'wrangler.jsonc')

function main(): void {
  const target = process.argv.slice(2).find(arg => arg !== '--')
  const label = target ?? 'local (top level)'

  let built: unknown
  try {
    built = JSON.parse(readFileSync(BUILD_ENVIRONMENT_FILE, 'utf8')).siteEnvironment
  } catch {
    throw new Error(
      `No ${path.relative(process.cwd(), BUILD_ENVIRONMENT_FILE)}: build with build:worker first.`
    )
  }

  // Throws when wrangler.jsonc has no env named `target`.
  const config = unstable_readConfig(
    { config: WRANGLER_CONFIG, env: target },
    { hideWarnings: true }
  )
  const runtime = config.vars?.SITE_ENVIRONMENT
  const mismatch = buildEnvironmentMismatch(built, {
    SITE_ENVIRONMENT: typeof runtime === 'string' ? runtime : undefined
  })
  if (mismatch) {
    throw new Error(
      `Refusing: this Worker was built for "${mismatch.built}", but ${label} runs as ` +
        `"${mismatch.runtime}". Build with the matching build:worker:<env>.`
    )
  }
  console.log(`Worker build matches ${label}: ${built}.`)
}

try {
  main()
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error))
  process.exitCode = 1
}
