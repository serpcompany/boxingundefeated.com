import { captureException, flush, isEnabled, withScope } from '@sentry/core'
import type { Instrumentation } from 'next'
import { scrubUrl } from './lib/sentry/scrub'

/**
 * Server errors to Sentry: server component, route handler and render errors, which Next.js
 * catches and answers with an error page, so they never reach the Worker's own error capture.
 * After serp.xxx's `instrumentation.ts`.
 *
 * On the Worker, lib/sentry/worker.ts owns the Sentry client (`@sentry/nextjs/cloudflare`) and has
 * already put the request on the scope; this hook reports into it. It is `captureRequestError` of
 * `@sentry/nextjs` rebuilt on `@sentry/core`: on the server `@sentry/nextjs` resolves to its
 * Node.js build, which would add megabytes to the Worker. When Sentry is off (no DSN, or the
 * `local` environment; `next dev` and `next start` included), there is no client and this returns
 * at once.
 */
export const onRequestError: Instrumentation.onRequestError = (error, request, context) => {
  try {
    if (!isEnabled()) return
    withScope(scope => {
      scope.setContext('nextjs', {
        request_path: scrubUrl(request.path),
        router_kind: context.routerKind,
        router_path: context.routePath,
        route_type: context.routeType
      })
      scope.setTransactionName(`${request.method} ${context.routePath}`)
      captureException(error, {
        mechanism: { handled: false, type: 'auto.function.nextjs.on_request_error' }
      })
    })
    // A streamed render can fail after the Worker returned its response; keep the isolate alive
    // until the event is sent.
    getOpenNextExecutionContext()?.waitUntil(flush(2000).catch(() => false))
  } catch {
    // Sentry must never break a page.
  }
}

type ExecutionContextLike = { waitUntil(promise: Promise<unknown>): void }

/** The request's ExecutionContext, which OpenNext keeps on a global symbol. */
function getOpenNextExecutionContext(): ExecutionContextLike | undefined {
  const context = (globalThis as Record<symbol, { ctx?: ExecutionContextLike } | undefined>)[
    Symbol.for('__cloudflare-context__')
  ]
  return typeof context?.ctx?.waitUntil === 'function' ? context.ctx : undefined
}
