/**
 * The build/runtime environment guard, step 0 of lib/worker/handle-request.ts.
 *
 * Prerendered HTML is fixed at build: its robots meta tag, canonicals and Google Tag Manager come
 * from the build's SITE_ENVIRONMENT (lib/site-config.ts). A staging build served as production
 * would ship noindex pages with staging canonicals; a production build served as staging would
 * ship indexable pages with production canonicals and GTM. So a Worker whose runtime
 * `SITE_ENVIRONMENT` var is not the environment it was built for fails closed: every request gets
 * a 503 that is never cached and never indexed.
 *
 * `build:worker` records the build's environment in `.open-next/build-environment.json`
 * (scripts/write-build-environment.ts) and worker.ts passes it in. The deploy workflows refuse the
 * same mismatch before they deploy (scripts/check-build-environment.ts).
 */
import {
  NON_PRODUCTION_ROBOTS_TAG,
  parseSiteEnvironment,
  type SiteEnvironment
} from '../site-config'
import type { WorkerEnvironment } from './environment-policy'

/** The file `build:worker` writes next to the OpenNext output. */
export interface BuildEnvironmentRecord {
  siteEnvironment: SiteEnvironment
  /** The commit the Worker was built from (`GITHUB_SHA` in CI). */
  commit: string
}

/**
 * The response header that names the build's commit. Only requests with the smoke-test header get
 * it, so a deploy job can wait until the Worker that answers is the one it just deployed.
 */
export const BUILD_COMMIT_HEADER = 'x-boxingundefeated-build'

export interface BuildEnvironmentMismatch {
  event: 'build_environment_mismatch'
  /** The recorded build environment, or what was found instead of a valid one. */
  built: string
  runtime: SiteEnvironment
}

/** The runtime environment, read the way lib/site-config.ts reads it: unknown or missing is local. */
export function runtimeSiteEnvironment(env: WorkerEnvironment): SiteEnvironment {
  return parseSiteEnvironment(env.SITE_ENVIRONMENT) ?? 'local'
}

/** The mismatch between the recorded build environment and the runtime var, or null if none. */
export function buildEnvironmentMismatch(
  built: unknown,
  env: WorkerEnvironment
): BuildEnvironmentMismatch | null {
  const runtime = runtimeSiteEnvironment(env)
  if (parseSiteEnvironment(built) === runtime) return null
  return { event: 'build_environment_mismatch', built: String(built), runtime }
}

/** The answer to every request while the build and the runtime disagree. */
export function buildEnvironmentUnavailable(request: Request): Response {
  const body = 'This deployment is misconfigured. Please try again later.\n'
  return new Response(request.method === 'HEAD' ? null : body, {
    status: 503,
    headers: {
      'cache-control': 'no-store',
      'content-type': 'text/plain; charset=utf-8',
      'x-robots-tag': NON_PRODUCTION_ROBOTS_TAG
    }
  })
}
