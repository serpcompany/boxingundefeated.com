/**
 * Records the environment a Worker build prerendered its HTML for, in
 * `.open-next/build-environment.json`. `build:worker` runs it after `opennextjs-cloudflare build`
 * (which empties `.open-next/`), with the same `SITE_ENVIRONMENT`. worker.ts imports the file, so
 * a build without it can't be bundled, and refuses to serve under any other environment
 * (lib/worker/build-environment.ts).
 */
import { writeFileSync } from 'node:fs'
import path from 'node:path'
import { resolveSiteEnvironment } from '../lib/site-config'
import type { BuildEnvironmentRecord } from '../lib/worker/build-environment'

const BUILD_ENVIRONMENT_FILE = path.join(__dirname, '..', '.open-next', 'build-environment.json')

// The resolution lib/site-config.ts applies inside the Worker build's `next build`.
const record: BuildEnvironmentRecord = {
  siteEnvironment: resolveSiteEnvironment({
    siteEnvironment: process.env.SITE_ENVIRONMENT,
    buildOutput: 'worker',
    nodeEnv: 'production'
  })
}

writeFileSync(BUILD_ENVIRONMENT_FILE, `${JSON.stringify(record)}\n`)
console.log(`Worker build environment: ${record.siteEnvironment}`)
