/**
 * The Sentry options the browser (lib/sentry/browser.ts) and the Worker (lib/sentry/worker.ts)
 * share, after serp.xxx's `sentry-options.ts`. serp telemetry standard, section 4 and "Required
 * defaults": errors only, one release, allowlisted payloads, no replay, profiling, tracing or
 * persistent identity, and a Sentry failure never breaks a page.
 *
 * Sentry is on only when both hold:
 *
 * - the environment is `staging` or `production`, resolved from `SITE_ENVIRONMENT` by
 *   lib/site-config.ts (a missing or unknown value is `local`, which never reports);
 * - a DSN is configured. The owner supplies it as the GitHub variable `SENTRY_DSN`; the deploy
 *   workflows pass it to the Worker (`wrangler deploy --var SENTRY_DSN:...`) and to the build,
 *   where next.config.ts copies it into the browser bundle. A DSN is public: it only lets a
 *   client send events. Without one, nothing loads and nothing is sent.
 *
 * Events carry the environment and the release, `<version>+<commit>` from the build stamp
 * (scripts/build-stamp.ts). `dist` is the environment too, because staging and production build
 * the same commit separately and their bundles' source maps differ.
 *
 * Imported by the browser bundle, the Worker and next.config.ts: no Node.js, Next.js or React
 * imports, and only types from Sentry.
 */
import type { Integration } from '@sentry/core'
import { resolveSiteEnvironment, type SiteEnvironment } from '../site-config'
import { MAX_BREADCRUMBS, scrubBreadcrumb, scrubEvent } from './scrub'

/** The environments that report errors when a DSN is configured. */
export const REPORTING_ENVIRONMENTS: readonly SiteEnvironment[] = ['staging', 'production']

export interface SentryConfigInput {
  /** The Worker's `SENTRY_DSN` var, or the browser's build-time copy. */
  dsn?: string
  /** `SITE_ENVIRONMENT`, resolved by lib/site-config.ts. */
  siteEnvironment?: string
  /** `<version>+<commit>`, from the build stamp. */
  release?: string
}

/**
 * What the SDK may collect: nothing about the person or the request beyond what the scrubber
 * keeps. Sentry 11 replaced `sendDefaultPii` with these settings; `userInfo: false` also tells
 * Sentry not to infer the sender's IP address. Every field is off, so the SDK's defaults (which
 * collect most of them) never apply.
 */
export const sentryDataCollection = {
  userInfo: false,
  cookies: false,
  httpHeaders: false,
  httpBodies: [],
  urlQueryParams: false,
  graphQL: { document: false, variables: false },
  genAI: { inputs: false, outputs: false },
  databaseQueryData: false,
  queues: false,
  stackFrameVariables: false,
  frameContextLines: 0
} as const

/** `<version>+<commit>`, or undefined when the commit is unknown (a release must be immutable). */
export function sentryRelease(version: string, commit: string | undefined): string | undefined {
  const sha = commit?.trim()
  if (!sha || sha === 'unknown') return undefined
  return `${version.trim()}+${sha}`
}

/** Options every runtime passes to Sentry. Off without a DSN or outside staging and production. */
export function buildSentryOptions({ dsn, siteEnvironment, release }: SentryConfigInput) {
  const environment = resolveSiteEnvironment({ siteEnvironment })
  const trimmedDsn = dsn?.trim() || undefined
  const enabled = Boolean(trimmedDsn) && REPORTING_ENVIRONMENTS.includes(environment)
  const trimmedRelease = release?.trim()

  return {
    enabled,
    dsn: enabled ? trimmedDsn : undefined,
    environment,
    dist: environment,
    ...(trimmedRelease ? { release: trimmedRelease } : {}),
    dataCollection: { ...sentryDataCollection, httpBodies: [] },
    maxBreadcrumbs: MAX_BREADCRUMBS,
    // No tracing: without a sample rate the SDK records no spans and sends no transactions, and
    // the static lifecycle keeps the server SDK from adding its span streaming.
    tracesSampleRate: undefined,
    traceLifecycle: 'static' as const,
    beforeSend: scrubEvent,
    beforeBreadcrumb: scrubBreadcrumb
  }
}

/**
 * The integrations each runtime keeps from the SDK's defaults: error capture, its context and
 * breadcrumbs. Everything else is dropped, so a future SDK default (sessions, tracing, console
 * capture, outgoing trace headers) stays off until it is reviewed here.
 */
export const BROWSER_INTEGRATIONS = [
  'EventFilters',
  'FunctionToString',
  'BrowserApiErrors',
  'Breadcrumbs',
  'GlobalHandlers',
  'LinkedErrors',
  'Dedupe',
  'HttpContext',
  'NextjsClientStackFrameNormalization'
] as const

/** `Nextjs` drops Next.js control-flow throws (`notFound()`, `redirect()`) and sets the release. */
export const WORKER_INTEGRATIONS = [
  'Dedupe',
  'EventFilters',
  'FunctionToString',
  'LinkedErrors',
  'RequestData',
  'Nextjs'
] as const

export function keepIntegrations(
  integrations: Integration[],
  allowed: readonly string[]
): Integration[] {
  return integrations.filter(integration => allowed.includes(integration.name))
}

/**
 * The browser's build-time values, for next.config.ts `env`. Empty strings when Sentry is off, so
 * the bundler drops the browser SDK entirely (instrumentation-client.ts).
 */
export function browserSentryBuildEnv(
  input: Omit<SentryConfigInput, 'release'> & { release: () => string | undefined }
): Record<
  'NEXT_PUBLIC_SENTRY_DSN' | 'NEXT_PUBLIC_SENTRY_ENVIRONMENT' | 'NEXT_PUBLIC_SENTRY_RELEASE',
  string
> {
  const options = buildSentryOptions({ dsn: input.dsn, siteEnvironment: input.siteEnvironment })
  if (!options.enabled || !options.dsn) {
    return {
      NEXT_PUBLIC_SENTRY_DSN: '',
      NEXT_PUBLIC_SENTRY_ENVIRONMENT: '',
      NEXT_PUBLIC_SENTRY_RELEASE: ''
    }
  }
  return {
    NEXT_PUBLIC_SENTRY_DSN: options.dsn,
    NEXT_PUBLIC_SENTRY_ENVIRONMENT: options.environment,
    NEXT_PUBLIC_SENTRY_RELEASE: input.release() ?? ''
  }
}

/**
 * Worker stack frames name the bundled module (`worker.js`, with or without a path). The deploy
 * uploads that bundle and its source map to the release as `app:///worker.js`
 * (scripts/sentry-release.sh), so frames are renamed to match. Frames with a scheme (`node:`,
 * `https:`) or that aren't scripts stay as they are.
 */
export const WORKER_FRAME_PREFIX = 'app:///'

export function toUploadedWorkerFilename(filename: string | undefined): string | undefined {
  if (!filename || /^[a-z][a-z0-9+.-]*:/i.test(filename) || !/\.[cm]?js$/.test(filename)) {
    return filename
  }
  return `${WORKER_FRAME_PREFIX}${filename.split('/').pop()}`
}
