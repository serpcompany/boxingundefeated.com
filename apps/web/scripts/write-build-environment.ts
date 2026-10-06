/**
 * Records the environment a Worker build prerendered its HTML for, and the commit it was built
 * from, in
 * `.open-next/build-environment.json`. `build:worker` runs it after `opennextjs-cloudflare build`
 * (which empties `.open-next/`), with the same `SITE_ENVIRONMENT`. worker.ts imports the file, so
 * a build without it can't be bundled, and refuses to serve under any other environment
 * (lib/worker/build-environment.ts). The commit is `GITHUB_SHA` in CI, else `git rev-parse HEAD`;
 * the Worker sends it on smoke-test requests so a deploy can wait for its own version.
 */
import { execFileSync } from 'node:child_process'
import { writeFileSync } from 'node:fs'
import path from 'node:path'
import { resolveSiteEnvironment } from '../lib/site-config'
import type { BuildEnvironmentRecord } from '../lib/worker/build-environment'

const BUILD_ENVIRONMENT_FILE = path.join(__dirname, '..', '.open-next', 'build-environment.json')

function buildCommit(): string {
  if (process.env.GITHUB_SHA) return process.env.GITHUB_SHA
  try {
    return execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim()
  } catch {
    return 'unknown'
  }
}

const record: BuildEnvironmentRecord = {
  // The resolution lib/site-config.ts applies inside the Worker build's `next build`.
  siteEnvironment: resolveSiteEnvironment({
    siteEnvironment: process.env.SITE_ENVIRONMENT,
    buildOutput: 'worker',
    nodeEnv: 'production'
  }),
  commit: buildCommit()
}

writeFileSync(BUILD_ENVIRONMENT_FILE, `${JSON.stringify(record)}\n`)
console.log(`Worker build environment: ${record.siteEnvironment}, commit ${record.commit}`)
