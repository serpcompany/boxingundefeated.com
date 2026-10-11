/**
 * What `pnpm db:copy-photos` (scripts/d1/copy-photos.ts) needs apart from Wrangler: which photo
 * URLs the source has, how one photo is fetched politely from boxrec.com, the pacing between
 * requests and the `photos` rows it writes (#64). Keys and URL paths are in ../photos.ts.
 */
import { type PhotoExtension, sniffPhotoType } from '../photos'
import type { Row } from './rows'
import type { SourceBoxer } from './source'
import { buildUpserts } from './sql'

/** How the copy introduces itself to boxrec.com. */
export const PHOTO_USER_AGENT = 'BoxingUndefeatedPhotoCopy/1.0 (+https://boxingundefeated.com/)'
/** The only hosts a photo is fetched from, redirects included. */
export const PHOTO_SOURCE_HOSTS: ReadonlySet<string> = new Set(['boxrec.com', 'www.boxrec.com'])
/** BoxRec's thumbnails are about 10 KB; anything this large isn't one. */
export const PHOTO_MAX_BYTES = 5 * 1024 * 1024
/** The least time between two requests to boxrec.com: at most 2 a second by default. */
export const PHOTO_DEFAULT_INTERVAL_MS = 500
export const PHOTO_MIN_INTERVAL_MS = 250
/** BoxRec's own "no photo" image, which pages replace with the site's placeholder. */
export const PLACEHOLDER_AVATAR = /v6-avatar\.svg/

const MAX_REDIRECTS = 3
const REDIRECT_STATUSES = new Set([301, 302, 303, 307, 308])

export function isPlaceholderAvatar(url: string | null | undefined): boolean {
  return PLACEHOLDER_AVATAR.test(url ?? '')
}

/** An `https:` URL on boxrec.com, the only place photos are copied from. */
export function isPhotoSourceUrl(value: string): boolean {
  if (!URL.canParse(value)) return false
  const url = new URL(value)
  return url.protocol === 'https:' && PHOTO_SOURCE_HOSTS.has(url.hostname) && url.port === ''
}

export interface PhotoSources {
  /** Each photo URL once, in the order `/boxers/` lists its boxers, so a partial copy covers
   * the most-viewed pages first. */
  urls: string[]
  /** Boxers with a photo URL on boxrec.com. */
  boxersWithPhoto: number
  /** Boxers with BoxRec's placeholder or no URL: they show the site's placeholder. */
  boxersWithoutPhoto: number
  /** Photo URLs elsewhere than boxrec.com, which are never fetched. */
  offSite: string[]
}

/** The photos to copy for a validated source (`prepareDataset(...).records`). */
export function photoSources(records: readonly SourceBoxer[]): PhotoSources {
  const urls = new Set<string>()
  const offSite = new Set<string>()
  let boxersWithPhoto = 0
  let boxersWithoutPhoto = 0
  // `/boxers/`'s order: most wins, then most bouts, then name (queries.ts `directoryOrder`).
  const ordered = [...records].sort(
    (a, b) =>
      b.proWins - a.proWins ||
      b.proTotalBouts - a.proTotalBouts ||
      a.name.localeCompare(b.name) ||
      a.id - b.id
  )
  for (const record of ordered) {
    const url = record.avatarImage
    if (!url || isPlaceholderAvatar(url)) {
      boxersWithoutPhoto++
    } else if (isPhotoSourceUrl(url)) {
      boxersWithPhoto++
      urls.add(url)
    } else {
      offSite.add(url)
    }
  }
  return { urls: [...urls], boxersWithPhoto, boxersWithoutPhoto, offSite: [...offSite] }
}

export type PhotoFetchResult =
  | { ok: true; bytes: Uint8Array; extension: PhotoExtension; attempts: number }
  | {
      ok: false
      reason: string
      attempts: number
      /**
       * The answer looks like boxrec.com refusing or failing (403, 429, 5xx, a timeout or a network
       * error), not like this one photo being gone (404) or bad: the copy stops after a run of
       * these.
       */
      refused: boolean
    }

export interface PhotoFetchOptions {
  fetch?: typeof fetch
  sleep?: (ms: number) => Promise<void>
  /** Awaited before every request, retries and redirects included (`createPacer`). */
  pace?: () => Promise<void>
  /** Tries for a 429, a 5xx, a timeout or a network error. */
  attempts?: number
  /** The wait before a retry without `Retry-After`, doubled each time. */
  retryDelayMs?: number
  /** The longest `Retry-After` honoured; a longer one is cut to this. */
  maxRetryAfterMs?: number
  timeoutMs?: number
  maxBytes?: number
}

type Attempt =
  | { ok: true; bytes: Uint8Array; extension: PhotoExtension }
  | { ok: false; reason: string; retryable: boolean; retryAfterMs?: number }

const defaultSleep = (ms: number) => new Promise<void>(resolve => setTimeout(resolve, ms))

/** `Retry-After` in milliseconds (seconds or an HTTP date), at most `max`; undefined if absent. */
export function retryAfterMs(
  value: string | null,
  max: number,
  now = Date.now()
): number | undefined {
  if (!value) return undefined
  const seconds = Number(value)
  const ms = Number.isFinite(seconds) ? seconds * 1000 : Date.parse(value) - now
  return Number.isFinite(ms) ? Math.min(Math.max(ms, 0), max) : undefined
}

/** The body, or null once it passes `maxBytes`. */
async function readCapped(response: Response, maxBytes: number): Promise<Uint8Array | null> {
  if (!response.body) return new Uint8Array()
  const reader = response.body.getReader()
  const chunks: Uint8Array[] = []
  let size = 0
  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    size += value.byteLength
    if (size > maxBytes) {
      await reader.cancel()
      return null
    }
    chunks.push(value)
  }
  const bytes = new Uint8Array(size)
  let offset = 0
  for (const chunk of chunks) {
    bytes.set(chunk, offset)
    offset += chunk.byteLength
  }
  return bytes
}

async function attempt(url: string, options: Required<PhotoFetchOptions>): Promise<Attempt> {
  let current = url
  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    await options.pace()
    let response: Response
    try {
      response = await options.fetch(current, {
        redirect: 'manual',
        headers: { 'user-agent': PHOTO_USER_AGENT, accept: 'image/*' },
        signal: AbortSignal.timeout(options.timeoutMs)
      })
    } catch (error) {
      const timedOut = error instanceof Error && error.name === 'TimeoutError'
      return { ok: false, reason: timedOut ? 'timeout' : 'network error', retryable: true }
    }
    if (REDIRECT_STATUSES.has(response.status)) {
      await response.body?.cancel()
      const location = response.headers.get('location')
      const next = location && URL.canParse(location, current) ? new URL(location, current) : null
      if (!next || !isPhotoSourceUrl(next.href)) {
        return { ok: false, reason: 'redirect off boxrec.com', retryable: false }
      }
      current = next.href
      continue
    }
    if (response.status !== 200) {
      await response.body?.cancel()
      return {
        ok: false,
        reason: `HTTP ${response.status}`,
        retryable: response.status === 429 || response.status >= 500,
        retryAfterMs: retryAfterMs(response.headers.get('retry-after'), options.maxRetryAfterMs)
      }
    }
    const declared = Number(response.headers.get('content-length') ?? Number.NaN)
    if (declared > options.maxBytes) {
      await response.body?.cancel()
      return { ok: false, reason: 'too large', retryable: false }
    }
    const bytes = await readCapped(response, options.maxBytes)
    if (!bytes) return { ok: false, reason: 'too large', retryable: false }
    const extension = sniffPhotoType(bytes)
    if (!extension) return { ok: false, reason: 'not an image', retryable: false }
    return { ok: true, bytes, extension }
  }
  return { ok: false, reason: 'too many redirects', retryable: false }
}

/**
 * Fetches one photo from boxrec.com with the copy's user agent. Redirects are followed only on
 * boxrec.com, and only a JPEG, PNG, GIF or WebP of at most `maxBytes` is kept (by its bytes, not
 * its content type). A 429, a 5xx, a timeout or a network error is retried after `Retry-After`,
 * or else a doubling delay; any other answer is final.
 */
export async function fetchPhoto(
  url: string,
  options: PhotoFetchOptions = {}
): Promise<PhotoFetchResult> {
  const resolved: Required<PhotoFetchOptions> = {
    fetch: options.fetch ?? fetch,
    sleep: options.sleep ?? defaultSleep,
    pace: options.pace ?? (async () => {}),
    attempts: options.attempts ?? 3,
    retryDelayMs: options.retryDelayMs ?? 5_000,
    maxRetryAfterMs: options.maxRetryAfterMs ?? 120_000,
    timeoutMs: options.timeoutMs ?? 30_000,
    maxBytes: options.maxBytes ?? PHOTO_MAX_BYTES
  }
  if (!isPhotoSourceUrl(url)) {
    return { ok: false, reason: 'not on boxrec.com', attempts: 0, refused: false }
  }
  for (let tries = 1; ; tries++) {
    const result = await attempt(url, resolved)
    if (result.ok) return { ...result, attempts: tries }
    if (!result.retryable || tries >= resolved.attempts) {
      const refused = result.retryable || result.reason === 'HTTP 403'
      return { ok: false, reason: result.reason, attempts: tries, refused }
    }
    await resolved.sleep(result.retryAfterMs ?? resolved.retryDelayMs * 2 ** (tries - 1))
  }
}

/**
 * Spaces calls to `wait()` at least `intervalMs` apart, from the start of one to the next. The
 * next deadline counts from when `wait()` returns (the request starts), not from when the sleep
 * was due to end, so a late wake-up cannot shorten the gap that follows.
 */
export function createPacer(
  intervalMs: number,
  {
    now = () => Date.now(),
    sleep = defaultSleep
  }: { now?: () => number; sleep?: typeof defaultSleep } = {}
): { wait: () => Promise<void> } {
  let next = Number.NEGATIVE_INFINITY
  return {
    async wait() {
      let at = now()
      if (at < next) {
        await sleep(next - at)
        at = now()
      }
      next = at + intervalMs
    }
  }
}

/** One copied photo, as the `photos` table stores it. */
export interface PhotoRow {
  sourceUrl: string
  key: string
  contentType: string
  bytes: number
}

export const PHOTO_COLUMNS = ['source_url', 'key', 'content_type', 'bytes'] as const

/** Upserts on `source_url`: re-running with the same rows writes nothing. */
export function buildPhotoUpserts(rows: readonly PhotoRow[]): string[] {
  return buildUpserts(
    { table: 'photos', columns: PHOTO_COLUMNS, conflict: ['source_url'] },
    rows.map(
      (row): Row => ({
        source_url: row.sourceUrl,
        key: row.key,
        content_type: row.contentType,
        bytes: row.bytes
      })
    )
  )
}
