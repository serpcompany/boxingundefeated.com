/**
 * The Worker's request pipeline. `worker.ts` passes each request here with `serve`, the handler
 * that `opennextjs-cloudflare build` generates. In order:
 *
 * 1. Canonical host: with `CANONICAL_HOST_REDIRECT=on`, `www.boxingundefeated.com` and
 *    `*.workers.dev` get one 308 to the environment's origin, already in canonical slash form
 *    (lib/routing/canonical-host.ts). Requests with the smoke-test header are exempt.
 * 2. The environment's crawl policy (lib/worker/environment-policy.ts).
 * 3. `serve`: OpenNext applies the trailing-slash `redirects()` from next.config.ts
 *    (lib/routing/trailing-slash.ts), then serves the page, or the file from `public/` through
 *    its asset resolver.
 *
 * `assets.run_worker_first` in wrangler.jsonc sends every request except /_next/static/ here
 * first, so files from `public/` go through the same pipeline as pages.
 */
import { type CanonicalHostEnvironment, canonicalHostRedirect } from '../routing/canonical-host'
import { type WorkerEnvironment, withEnvironmentPolicy } from './environment-policy'

export type WorkerRequestEnvironment = WorkerEnvironment & CanonicalHostEnvironment

export function handleWorkerRequest(
  request: Request,
  env: WorkerRequestEnvironment,
  serve: () => Promise<Response>
): Promise<Response> {
  const redirect = canonicalHostRedirect(request, env)
  if (redirect) {
    return Promise.resolve(redirect)
  }
  return withEnvironmentPolicy(request, env, serve)
}
