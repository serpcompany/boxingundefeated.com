/**
 * The allowlist every Sentry event and breadcrumb passes through before it leaves the browser or
 * the Worker (`beforeSend`, `beforeBreadcrumb`; lib/sentry/options.ts). serp telemetry standard,
 * "Required defaults": bounded metadata, scrubbed with an allowlist.
 *
 * An event keeps only the fields listed here; everything else the SDK or an integration adds is
 * dropped, so there is no user, IP address, cookie, header, query string, request body, local
 * variable or console message in what is sent. URLs lose their query string and fragment, and
 * every free-text field is cut to a fixed length.
 *
 * Imported by the browser bundle, the Worker and next.config.ts: no Node.js, Next.js or React
 * imports, and only types from Sentry.
 */
import type { Breadcrumb, Event, Exception, StackFrame } from '@sentry/core'

/** Longest exception value, message or breadcrumb message kept, in characters. */
export const MAX_TEXT_LENGTH = 500
/** Most breadcrumbs an event keeps: the latest ones. */
export const MAX_BREADCRUMBS = 30
/** Most chained exceptions (`cause`) an event keeps. */
const MAX_EXCEPTIONS = 5
const MAX_SHORT_TEXT_LENGTH = 200

/** The tags this site sets (lib/sentry/report.ts); the SDK's own are dropped. */
const ALLOWED_TAGS = ['boundary', 'next_digest'] as const

/**
 * Breadcrumbs that say what the page did, never what the person typed or logged. `ui.click` keeps
 * only the element's selector (the SDK never records text or values).
 */
const ALLOWED_BREADCRUMB_CATEGORIES = new Set(['navigation', 'fetch', 'xhr', 'ui.click'])

const URL_SCHEME = /^[a-z][a-z0-9+.-]*:/i
/** A URL's query string or fragment, inside free text. */
const URL_QUERY_IN_TEXT = /(\b[a-z][a-z0-9+.-]*:\/\/[^\s?#"'<>]*|\/[^\s?#"'<>]*)[?#][^\s"'<>]*/gi

function bounded(value: unknown, max = MAX_TEXT_LENGTH): string | undefined {
  if (typeof value !== 'string') return undefined
  return value.length > max ? `${value.slice(0, max - 1)}…` : value
}

/** Removes the query string and fragment of an absolute or root-relative URL. */
export function scrubUrl(value: string): string {
  try {
    const url = new URL(value, 'https://relative.invalid')
    url.search = ''
    url.hash = ''
    return URL_SCHEME.test(value) ? url.toString() : url.pathname
  } catch {
    return '[unparsed url]'
  }
}

/** Free text (an exception value, a message): its URLs lose their query string; then it's cut. */
export function scrubText(value: unknown, max = MAX_TEXT_LENGTH): string | undefined {
  if (typeof value !== 'string') return undefined
  return bounded(value.replace(URL_QUERY_IN_TEXT, '$1'), max)
}

function scrubOptionalUrl(value: unknown): string | undefined {
  return typeof value === 'string' ? bounded(scrubUrl(value), MAX_SHORT_TEXT_LENGTH * 5) : undefined
}

function definedOnly<T extends object>(value: T): T {
  for (const key of Object.keys(value) as (keyof T)[]) {
    if (value[key] === undefined) delete value[key]
  }
  return value
}

function scrubFrame(frame: StackFrame): StackFrame {
  return definedOnly({
    filename: scrubOptionalUrl(frame.filename),
    abs_path: scrubOptionalUrl(frame.abs_path),
    function: bounded(frame.function, MAX_SHORT_TEXT_LENGTH),
    module: bounded(frame.module, MAX_SHORT_TEXT_LENGTH),
    lineno: frame.lineno,
    colno: frame.colno,
    in_app: frame.in_app,
    platform: frame.platform,
    debug_id: frame.debug_id
  })
}

function scrubException(exception: Exception): Exception {
  const { mechanism, stacktrace } = exception
  return definedOnly({
    type: bounded(exception.type, MAX_SHORT_TEXT_LENGTH),
    value: scrubText(exception.value),
    module: bounded(exception.module, MAX_SHORT_TEXT_LENGTH),
    mechanism: mechanism
      ? definedOnly({
          type: bounded(mechanism.type, MAX_SHORT_TEXT_LENGTH) ?? 'generic',
          handled: mechanism.handled,
          synthetic: mechanism.synthetic,
          source: bounded(mechanism.source, MAX_SHORT_TEXT_LENGTH),
          is_exception_group: mechanism.is_exception_group,
          exception_id: mechanism.exception_id,
          parent_id: mechanism.parent_id
        })
      : undefined,
    stacktrace: stacktrace?.frames ? { frames: stacktrace.frames.map(scrubFrame) } : undefined
  })
}

/** The breadcrumb's allowlisted fields, or null to drop it. */
export function scrubBreadcrumb(breadcrumb: Breadcrumb): Breadcrumb | null {
  const category = breadcrumb.category
  if (!category || !ALLOWED_BREADCRUMB_CATEGORIES.has(category)) return null
  const data = breadcrumb.data ?? {}
  const scrubbedData =
    category === 'navigation'
      ? definedOnly({ from: scrubOptionalUrl(data.from), to: scrubOptionalUrl(data.to) })
      : category === 'ui.click'
        ? {}
        : definedOnly({
            method: bounded(data.method, 16),
            url: scrubOptionalUrl(data.url),
            status_code: typeof data.status_code === 'number' ? data.status_code : undefined
          })
  return definedOnly({
    type: bounded(breadcrumb.type, 32),
    category,
    level: breadcrumb.level,
    timestamp: breadcrumb.timestamp,
    message:
      category === 'ui.click' ? bounded(breadcrumb.message, MAX_SHORT_TEXT_LENGTH) : undefined,
    data: Object.keys(scrubbedData).length > 0 ? scrubbedData : undefined
  })
}

function scrubTags(tags: Event['tags']): Event['tags'] {
  if (!tags) return undefined
  const kept: NonNullable<Event['tags']> = {}
  for (const key of ALLOWED_TAGS) {
    const value = tags[key]
    if (typeof value === 'string') kept[key] = bounded(value, MAX_SHORT_TEXT_LENGTH) as string
  }
  return Object.keys(kept).length > 0 ? kept : undefined
}

function pickStrings(value: unknown, keys: string[]): Record<string, string> | undefined {
  if (!value || typeof value !== 'object') return undefined
  const source = value as Record<string, unknown>
  const kept: Record<string, string> = {}
  for (const key of keys) {
    const text = bounded(source[key], MAX_SHORT_TEXT_LENGTH)
    if (text !== undefined) kept[key] = key === 'request_path' ? scrubUrl(text) : text
  }
  return Object.keys(kept).length > 0 ? kept : undefined
}

/**
 * Contexts: the trace IDs (to join a browser and a Worker event), the JavaScript runtime, and the
 * route that failed on the server (instrumentation.ts). Device, OS, culture, cloud and response
 * contexts are dropped.
 */
function scrubContexts(contexts: Event['contexts']): Event['contexts'] {
  if (!contexts) return undefined
  return definedOnly({
    trace: pickStrings(contexts.trace, ['trace_id', 'span_id', 'parent_span_id']),
    runtime: pickStrings(contexts.runtime, ['name', 'version']),
    nextjs: pickStrings(contexts.nextjs, [
      'request_path',
      'router_kind',
      'router_path',
      'route_type'
    ])
  }) as Event['contexts']
}

/**
 * The event's allowlisted fields. `request` keeps the URL without its query string and the method:
 * no headers (user agent included), cookies, query string, body or environment. `user`, `extra`,
 * `server_name`, `modules` and everything else not listed here are dropped.
 *
 * `sdk` is the SDK's name, version and settings (its `infer_ip: "never"` tells Sentry not to store
 * the sender's IP address). `sdkProcessingMetadata` is the SDK's internal state; it is deleted
 * before the event is sent and is kept only so the SDK can finish processing.
 */
export function scrubEvent<T extends Event>(event: T): T {
  const request = event.request
  const exceptions = event.exception?.values
  const breadcrumbs = event.breadcrumbs
    ?.map(scrubBreadcrumb)
    .filter((breadcrumb): breadcrumb is Breadcrumb => breadcrumb !== null)
    .slice(-MAX_BREADCRUMBS)

  const scrubbed: Event = definedOnly({
    event_id: event.event_id,
    type: event.type,
    timestamp: event.timestamp,
    level: event.level,
    platform: event.platform,
    logger: bounded(event.logger, MAX_SHORT_TEXT_LENGTH),
    release: event.release,
    dist: event.dist,
    environment: event.environment,
    transaction: scrubText(event.transaction, MAX_SHORT_TEXT_LENGTH),
    message: scrubText(event.message),
    fingerprint: event.fingerprint
      ?.slice(0, 10)
      .map(part => bounded(part, MAX_SHORT_TEXT_LENGTH) ?? ''),
    exception: exceptions
      ? { values: exceptions.slice(-MAX_EXCEPTIONS).map(scrubException) }
      : undefined,
    tags: scrubTags(event.tags),
    contexts: scrubContexts(event.contexts),
    breadcrumbs: breadcrumbs && breadcrumbs.length > 0 ? breadcrumbs : undefined,
    request: request
      ? definedOnly({ url: scrubOptionalUrl(request.url), method: bounded(request.method, 16) })
      : undefined,
    sdk: event.sdk,
    debug_meta: event.debug_meta,
    sdkProcessingMetadata: event.sdkProcessingMetadata
  })
  return scrubbed as T
}
