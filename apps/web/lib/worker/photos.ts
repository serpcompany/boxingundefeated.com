/**
 * `GET /photos/<sha256>.<ext>`: a boxer photo from the environment's R2 photo bucket (`PHOTOS`),
 * answered by the Worker itself, before OpenNext (lib/worker/handle-request.ts), so a copied photo
 * loads from this site, not boxrec.com (#64). `pnpm db:copy-photos` fills the bucket; pages link a
 * key only once D1's `photos` table records it (packages/data-ops/src/photos.ts).
 *
 * - Paths: only exactly `/photos/<64 lowercase hex>.<jpg|png|gif|webp>`, a file, so no trailing
 *   slash. Any other path under `/photos/` goes on to OpenNext: the 404 page, or for
 *   `/photos/<key>/` the trailing-slash redirect to the file.
 * - 200: the object, with the content type of its extension (the copy chose the extension from
 *   the bytes), its length and ETag, and `PHOTO_CACHE_CONTROL`: a key names its content, so a
 *   photo never changes. `nosniff`, so a browser never reads it as anything else.
 * - 304 for a GET or HEAD whose `If-None-Match` matches, 404 for a key the bucket doesn't hold,
 *   405 for a method other than GET or HEAD, and a generic 500 when R2 fails. The errors carry
 *   `no-store` and their own `noindex`, and are never cached.
 * - Cache API (`caches.default`, `options.cache`): each data center keeps a 200 photo, keyed by
 *   its URL without the query (the path names the content), so a repeat request reads no R2. A
 *   hit or a miss says so in `x-edge-cache`, as the page cache does. No effect on `*.workers.dev`.
 *
 * It only reads the bucket. No Next.js imports: this runs before OpenNext loads.
 */
import { PHOTO_CACHE_CONTROL, photoContentType, photoKeyFromPath } from '@boxingundefeated/data-ops'
import { EDGE_CACHE_HEADER, type EdgeCacheRuntime } from './edge-cache'
import { errorSummary } from './search-api'

/** What the route uses of the `PHOTOS` binding: reads only. */
export type PhotoBucket = Pick<R2Bucket, 'get' | 'head'>

export interface PhotoEvent {
  event: 'photo'
  status: 404 | 500
  key: string
  error?: string
}

export interface PhotoOptions {
  /** 404s and failures only: pages link only copied keys, so either means drift or an outage. */
  observe?: (event: PhotoEvent) => void
  /** The Cache API namespace (`caches.default`) and the execution context. Without it, R2 only. */
  cache?: EdgeCacheRuntime
}

export function isPhotoRequest(request: Request): boolean {
  return photoKeyFromPath(new URL(request.url).pathname) !== null
}

function plain(
  request: Request,
  status: number,
  text: string,
  headers: Record<string, string> = {}
) {
  return new Response(request.method === 'HEAD' ? null : text, {
    status,
    headers: {
      'content-type': 'text/plain; charset=utf-8',
      'cache-control': 'no-store',
      'x-robots-tag': 'noindex',
      ...headers
    }
  })
}

function photoHeaders(key: string, object: R2Object): Headers {
  return new Headers({
    'content-type': photoContentType(key) ?? 'application/octet-stream',
    'content-length': String(object.size),
    'cache-control': PHOTO_CACHE_CONTROL,
    etag: object.httpEtag,
    'last-modified': object.uploaded.toUTCString(),
    'x-content-type-options': 'nosniff'
  })
}

/** The response headers a stored copy keeps; the Cache API may add others (`age`, `cf-*`). */
const STORED_HEADERS = [
  'content-type',
  'content-length',
  'cache-control',
  'etag',
  'last-modified',
  'x-content-type-options'
] as const

/** Whether `If-None-Match` (`*`, or a list of tags, compared weakly) matches `etag`. */
export function matchesIfNoneMatch(ifNoneMatch: string | null, etag: string | null): boolean {
  if (ifNoneMatch === null || etag === null) return false
  if (ifNoneMatch.trim() === '*') return true
  const opaque = (tag: string) => tag.trim().replace(/^W\//, '')
  return ifNoneMatch.split(',').some(tag => opaque(tag) === opaque(etag))
}

/** A 304 with the photo's headers but no body or length. */
function notModified(headers: Headers): Response {
  headers.delete('content-length')
  return new Response(null, { status: 304, headers })
}

/** The cache key: the photo's URL without the query, as a plain GET. */
function cacheKeyFor(request: Request): Request {
  const { origin, pathname } = new URL(request.url)
  return new Request(`${origin}${pathname}`, { method: 'GET' })
}

/** The stored copy of a 200 photo, answered for a GET, a HEAD or a conditional request. */
function fromCache(request: Request, cached: Response): Response {
  const headers = new Headers()
  for (const name of STORED_HEADERS) {
    const value = cached.headers.get(name)
    if (value !== null) headers.set(name, value)
  }
  headers.set(EDGE_CACHE_HEADER, 'HIT')
  const conditional = matchesIfNoneMatch(request.headers.get('if-none-match'), headers.get('etag'))
  if (conditional || request.method === 'HEAD') {
    cached.body?.cancel().catch(() => undefined)
    return conditional ? notModified(headers) : new Response(null, { status: 200, headers })
  }
  return new Response(cached.body, { status: 200, headers })
}

export async function handlePhoto(
  request: Request,
  bucket: PhotoBucket,
  options: PhotoOptions = {}
): Promise<Response> {
  const key = photoKeyFromPath(new URL(request.url).pathname)
  if (!key) return plain(request, 404, 'Not found')
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    return plain(request, 405, 'Use GET.', { allow: 'GET, HEAD' })
  }

  const cacheKey = cacheKeyFor(request)
  const store = options.cache ? await options.cache.openCache().catch(() => undefined) : undefined
  const cached = store && (await store.match(cacheKey).catch(() => undefined))
  if (cached?.status === 200) return fromCache(request, cached)

  const ifNoneMatch = request.headers.get('if-none-match')
  let object: R2Object | R2ObjectBody | null
  try {
    if (request.method === 'HEAD') {
      object = await bucket.head(key)
    } else {
      // Only If-None-Match: any other precondition R2 would apply would turn into a wrong 304.
      object = await bucket.get(
        key,
        ifNoneMatch ? { onlyIf: new Headers({ 'if-none-match': ifNoneMatch }) } : undefined
      )
    }
  } catch (error) {
    options.observe?.({ event: 'photo', status: 500, key, error: errorSummary(error) })
    return plain(request, 500, 'The photo could not be read. Please try again.')
  }
  if (!object) {
    options.observe?.({ event: 'photo', status: 404, key })
    return plain(request, 404, 'Not found')
  }
  const headers = photoHeaders(key, object)
  if (store) headers.set(EDGE_CACHE_HEADER, 'MISS')
  if (request.method === 'HEAD') {
    return matchesIfNoneMatch(ifNoneMatch, object.httpEtag)
      ? notModified(headers)
      : new Response(null, { status: 200, headers })
  }
  // R2 leaves out the body when If-None-Match matched.
  if (!('body' in object)) return notModified(headers)

  if (!store || !options.cache) return new Response(object.body, { status: 200, headers })
  // One stream for the visitor, one for the stored copy, which is kept without `x-edge-cache`.
  const [body, stored] = object.body.tee()
  const copy = new Response(stored, { status: 200, headers: photoHeaders(key, object) })
  options.cache.context.waitUntil(store.put(cacheKey, copy).catch(() => undefined))
  return new Response(body, { status: 200, headers })
}

/** The Worker entry's handler on the `PHOTOS` binding, or none when the binding is missing. */
export function r2Photos(
  env: { PHOTOS?: PhotoBucket },
  options: PhotoOptions = {}
): ((request: Request) => Promise<Response>) | undefined {
  const bucket = env.PHOTOS
  return bucket ? request => handlePhoto(request, bucket, options) : undefined
}
