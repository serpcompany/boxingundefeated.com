/**
 * Reports an error that an error boundary rendered (app/error.tsx, app/global-error.tsx). React
 * catches these, so the SDK's global handlers never see them. For a server render error the
 * browser gets only its digest, which the Worker's event also carries (instrumentation.ts), so the
 * two can be matched (`next_digest`).
 *
 * `@sentry/core`, not `@sentry/nextjs`: boundaries are also bundled for server rendering, where
 * `@sentry/nextjs` resolves to the whole Node.js SDK. In the browser it reports to the client that
 * lib/sentry/browser.ts started. Without a DSN at build the branch is dead code, so no Sentry code
 * reaches the bundle; without a started client it does nothing.
 */
import { captureException } from '@sentry/core'

export type ErrorBoundaryName = 'route' | 'global'

/** `error` is what the boundary received: an Error, with `digest` for a server render error. */
export function reportBoundaryError(error: { digest?: string }, boundary: ErrorBoundaryName): void {
  if (!process.env.NEXT_PUBLIC_SENTRY_DSN) return
  try {
    captureException(error, {
      tags: { boundary, ...(error.digest ? { next_digest: error.digest } : {}) }
    })
  } catch {
    // Sentry must never break the error page.
  }
}
