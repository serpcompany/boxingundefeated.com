/**
 * Browser Sentry, started by instrumentation-client.ts before the page hydrates. next.config.ts
 * bakes the build's DSN, environment and release into the `NEXT_PUBLIC_SENTRY_*` values, and only
 * for a staging or production build with a DSN; otherwise they are empty and the bundler drops
 * this module and the SDK (lib/sentry/options.ts).
 *
 * Errors only: the SDK's session, tracing, console and culture integrations are dropped
 * (`BROWSER_INTEGRATIONS`), so it sends nothing on a page view, only when an error happens.
 * A failure to start never reaches the page.
 */
import { init } from '@sentry/nextjs'
import { BROWSER_INTEGRATIONS, buildSentryOptions, keepIntegrations } from './options'

export function startBrowserSentry(): void {
  try {
    init({
      ...buildSentryOptions({
        dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
        siteEnvironment: process.env.NEXT_PUBLIC_SENTRY_ENVIRONMENT,
        release: process.env.NEXT_PUBLIC_SENTRY_RELEASE
      }),
      integrations: defaults => keepIntegrations(defaults, BROWSER_INTEGRATIONS),
      // Errors from browser extensions are not the site's, and would spend the error quota.
      denyUrls: [/^(chrome|moz|safari-web)-extension:\/\//i, /^chrome:\/\//i]
    })
  } catch {
    // Sentry must never break a page.
  }
}
