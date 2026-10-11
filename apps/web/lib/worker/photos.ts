/**
 * `GET /photos/<sha256>.<ext>`: a boxer photo from the environment's R2 photo bucket (`PHOTOS`),
 * answered by the Worker itself, before OpenNext (lib/worker/handle-request.ts), so pages load
 * no image from boxrec.com (#64). `pnpm db:copy-photos` fills the bucket; pages link a photo only
 * once D1's `photos` table records it (packages/data-ops/src/photos.ts).
 *
 * - Paths: only exactly `/photos/<64 lowercase hex>.<jpg|png|gif|webp>`, a file, so no trailing
 *   slash. Any other path under `/photos/` goes on to OpenNext: the 404 page, or for
 *   `/photos/<key>/` the trailing-slash redirect to the file.
 * - 200: the object, with the content type of its extension (the copy chose the extension from
 *   the bytes), its length and ETag, and `PHOTO_CACHE_CONTROL`: a key names its content, so a
 *   photo never changes. `nosniff`, so a browser never reads it as anything else.
 * - 304 for a matching `If-None-Match`, 404 for a key the bucket doesn't hold, 405 for a method
 *   other than GET or HEAD, and a generic 500 when R2 fails, none of them cached.
 *
 * It only reads the bucket. No Next.js imports: this runs before OpenNext loads.
 */
import { PHOTO_CACHE_CONTROL, photoContentType, photoKeyFromPath } from '@boxingundefeated/data-ops'
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
  /** 404s and failures only: pages link only copied photos, so either means drift or an outage. */
  observe?: (event: PhotoEvent) => void
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
  let object: R2Object | R2ObjectBody | null
  try {
    if (request.method === 'HEAD') {
      object = await bucket.head(key)
    } else {
      // Only If-None-Match: any other precondition R2 would apply would turn into a wrong 304.
      const ifNoneMatch = request.headers.get('if-none-match')
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
  if (request.method === 'HEAD') return new Response(null, { status: 200, headers })
  // R2 leaves out the body when If-None-Match matched.
  if (!('body' in object)) {
    headers.delete('content-length')
    return new Response(null, { status: 304, headers })
  }
  return new Response(object.body, { status: 200, headers })
}

/** The Worker entry's handler on the `PHOTOS` binding, or none when the binding is missing. */
export function r2Photos(
  env: { PHOTOS?: PhotoBucket },
  options: PhotoOptions = {}
): ((request: Request) => Promise<Response>) | undefined {
  const bucket = env.PHOTOS
  return bucket ? request => handlePhoto(request, bucket, options) : undefined
}
