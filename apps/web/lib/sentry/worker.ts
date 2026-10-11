/**
 * Worker Sentry: serp.xxx's `withSentry` (`@sentry/nextjs/cloudflare`) around the Worker's fetch
 * handler, used only on requests where Sentry is on (lib/sentry/options.ts: a `SENTRY_DSN` var,
 * in staging or production). worker.ts wraps its handler with `withSentryWhenEnabled` at module
 * scope, where the SDK expects `withSentry` to be called.
 *
 * Off, every request goes straight to the handler, so nothing about the request or the response
 * changes. (`withSentry` itself, even without a DSN, proxies `env` and the execution context,
 * starts a span, re-streams some text responses and schedules a flush on every request.) If
 * wrapping fails, requests go to the handler without Sentry.
 *
 * On, the handler's own answers (the 503 gates, the edge cache, redirects, every status and
 * header) pass through unchanged. An exception the handler throws is reported and rethrown, so
 * the Workers runtime answers it as before.
 */

import type { Integration, StackFrame } from '@sentry/core'
import * as Sentry from '@sentry/nextjs/cloudflare'
import {
  buildSentryOptions,
  keepIntegrations,
  toUploadedWorkerFilename,
  WORKER_INTEGRATIONS
} from './options'

/** The vars Sentry reads: `SENTRY_DSN` (the deploy's `--var`), and wrangler.jsonc's environment. */
export interface SentryWorkerEnvironment {
  SENTRY_DSN?: string
  SITE_ENVIRONMENT?: string
}

export interface WorkerFetchHandler<Env> {
  fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response>
}

export type WrapWithSentry = <Env extends SentryWorkerEnvironment>(
  handler: WorkerFetchHandler<Env>,
  release: string | undefined
) => WorkerFetchHandler<Env>

export function workerSentryOptions(env: SentryWorkerEnvironment, release: string | undefined) {
  return buildSentryOptions({ dsn: env.SENTRY_DSN, siteEnvironment: env.SITE_ENVIRONMENT, release })
}

/**
 * Renames bundled Worker frames to the uploaded bundle's name (`toUploadedWorkerFilename`). Sentry
 * looks a frame's source map up by `abs_path` when it has one, so both are renamed.
 */
function uploadedFrame(frame: StackFrame): StackFrame {
  frame.filename = toUploadedWorkerFilename(frame.filename)
  if (frame.abs_path) frame.abs_path = toUploadedWorkerFilename(frame.abs_path)
  return frame
}

/**
 * `withSentry` re-streams a `text/plain` response that has no `Content-Length` header (its guess
 * at a streamed AI response), so the Worker would answer it chunked instead of with its length:
 * robots.txt and the 503 gates' bodies. Such a body, read into memory and given its length, passes
 * through `withSentry` untouched. Only those small text bodies reach this.
 */
export async function withKnownLength(response: Response): Promise<Response> {
  const type = response.headers.get('content-type') ?? ''
  if (!response.body || response.headers.has('content-length') || !/^text\/plain\b/i.test(type)) {
    return response
  }
  const body = await response.arrayBuffer()
  // The Workers idiom: copies status, headers and Workers-only fields into a mutable response.
  const sized = new Response(body, response)
  sized.headers.set('content-length', String(body.byteLength))
  return sized
}

/** `withSentry` around the handler, errors only, with the shared options and scrubber. */
export const wrapWithSentry: WrapWithSentry = <Env extends SentryWorkerEnvironment>(
  handler: WorkerFetchHandler<Env>,
  release: string | undefined
) => {
  // `withSentry` instruments the object it is given in place, so it gets its own.
  const instrumented: ExportedHandler<Env> = {
    fetch: async (request, env, ctx) =>
      withKnownLength(await handler.fetch(request as Request, env, ctx))
  }
  return Sentry.withSentry(
    (env: Env) => ({
      ...workerSentryOptions(env, release),
      integrations: (defaults: Integration[]) => [
        ...keepIntegrations(defaults, WORKER_INTEGRATIONS),
        Sentry.rewriteFramesIntegration({ iteratee: uploadedFrame })
      ]
    }),
    instrumented
  ) as WorkerFetchHandler<Env>
}

/** The handler, with Sentry around it on the requests where Sentry is on. */
export function withSentryWhenEnabled<Env extends SentryWorkerEnvironment>(
  handler: WorkerFetchHandler<Env>,
  release: string | undefined,
  wrap: WrapWithSentry = wrapWithSentry
): WorkerFetchHandler<Env> {
  let reporting: WorkerFetchHandler<Env>
  try {
    reporting = wrap(handler, release)
  } catch {
    reporting = handler
  }
  return {
    fetch(request, env, ctx) {
      const active = workerSentryOptions(env, release).enabled ? reporting : handler
      return active.fetch(request, env, ctx)
    }
  }
}
