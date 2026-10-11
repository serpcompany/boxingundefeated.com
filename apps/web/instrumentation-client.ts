// Browser error reporting (lib/sentry/browser.ts). Next.js runs this file before the page
// hydrates. next.config.ts sets NEXT_PUBLIC_SENTRY_DSN only for a staging or production build
// with a DSN; otherwise it is an empty string, this branch is dead code, and no Sentry code
// reaches the browser.
import { startBrowserSentry } from './lib/sentry/browser'

if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
  startBrowserSentry()
}
