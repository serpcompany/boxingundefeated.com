/**
 * Records the environment a Worker build prerendered its HTML for, the commit it was built from,
 * and its Sentry release, in
 * `.open-next/build-environment.json`. `build:worker` runs it after `opennextjs-cloudflare build`
 * (which empties `.open-next/`), with the same `SITE_ENVIRONMENT`. worker.ts imports the file, so
 * a build without it can't be bundled, and refuses to serve under any other environment
 * (lib/worker/build-environment.ts). The commit is `GITHUB_SHA` in CI, else `git rev-parse HEAD`
 * (scripts/build-stamp.ts); the Worker sends it on smoke-test requests so a deploy can wait for
 * its own version. The release is the one next.config.ts gave the browser bundle; the Worker
 * reports with it (lib/sentry/worker.ts) and the deploy uploads source maps to it.
 */
import { writeFileSync } from 'node:fs'
import path from 'node:path'
import { resolveSiteEnvironment } from '../lib/site-config'
import type { BuildEnvironmentRecord } from '../lib/worker/build-environment'
import { buildCommit, buildRelease } from './build-stamp'

const BUILD_ENVIRONMENT_FILE = path.join(__dirname, '..', '.open-next', 'build-environment.json')

const record: BuildEnvironmentRecord = {
  // The resolution lib/site-config.ts applies inside the Worker build's `next build`.
  siteEnvironment: resolveSiteEnvironment({ siteEnvironment: process.env.SITE_ENVIRONMENT }),
  commit: buildCommit(),
  release: buildRelease()
}

writeFileSync(BUILD_ENVIRONMENT_FILE, `${JSON.stringify(record)}\n`)
console.log(
  `Worker build environment: ${record.siteEnvironment}, commit ${record.commit}, ` +
    `release ${record.release ?? 'none'}`
)
