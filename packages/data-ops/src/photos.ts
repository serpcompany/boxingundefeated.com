/**
 * Boxer photos, copied from boxrec.com into each environment's R2 photo bucket (#64) and served
 * by the Worker from the same site.
 *
 * - A key is `photos/<sha256>.<ext>`: the SHA-256 of the photo's bytes, and the extension of the
 *   image type its first bytes show (`sniffPhotoType`), never the source URL's. So a key names
 *   its content, and an object is never overwritten with other content.
 * - The URL is the key under the site's root, `/photos/<sha256>.<ext>`: a file, so no trailing
 *   slash, and every extension here is in apps/web/lib/routing/file-extensions.ts.
 * - The `photos` table maps each copied source URL to its key (schema.ts). Pages link a photo only
 *   through it, so a key they link is one the copy finished (scripts/d1/copy-photos.ts).
 *
 * No Node.js or Next.js imports: the Worker uses this before OpenNext loads.
 */

/** The image types a photo may be, by key extension. */
export const PHOTO_CONTENT_TYPES = {
  jpg: 'image/jpeg',
  png: 'image/png',
  gif: 'image/gif',
  webp: 'image/webp'
} as const

export type PhotoExtension = keyof typeof PHOTO_CONTENT_TYPES

/** The R2 key prefix, and the URL path's first segment. */
export const PHOTO_KEY_PREFIX = 'photos/'

const KEY = /^photos\/[0-9a-f]{64}\.(jpg|png|gif|webp)$/

/** The cache policy of a photo: its key names its content, so it never changes. */
export const PHOTO_CACHE_CONTROL = 'public, max-age=31536000, immutable'

export function isPhotoExtension(value: string): value is PhotoExtension {
  return Object.hasOwn(PHOTO_CONTENT_TYPES, value)
}

/** `photos/<sha256>.<ext>` for a photo's SHA-256 (64 lowercase hex digits) and image type. */
export function photoKey(sha256: string, extension: PhotoExtension): string {
  const key = `${PHOTO_KEY_PREFIX}${sha256}.${extension}`
  if (!KEY.test(key)) throw new Error(`Not a photo key: ${JSON.stringify(key)}`)
  return key
}

export function isPhotoKey(value: string): boolean {
  return KEY.test(value)
}

/** The content type a key's extension stands for, or null for anything that isn't a key. */
export function photoContentType(key: string): string | null {
  const extension = KEY.exec(key)?.[1]
  return extension !== undefined && isPhotoExtension(extension)
    ? PHOTO_CONTENT_TYPES[extension]
    : null
}

/**
 * The same-site URL path of the photo `key`, `/photos/<sha256>.<ext>`, or null when there is no
 * key (the page shows the placeholder). A malformed key is null too, so a bad row can't put an
 * arbitrary path on a page.
 */
export function photoPath(key: string | null | undefined): string | null {
  return typeof key === 'string' && KEY.test(key) ? `/${key}` : null
}

/** The key a request path names, or null when the path isn't exactly a photo's. */
export function photoKeyFromPath(pathname: string): string | null {
  if (!pathname.startsWith(`/${PHOTO_KEY_PREFIX}`)) return null
  const key = pathname.slice(1)
  return KEY.test(key) ? key : null
}

const startsWith = (bytes: Uint8Array, signature: readonly number[], offset = 0) =>
  bytes.length >= offset + signature.length &&
  signature.every((byte, index) => bytes[offset + index] === byte)

/**
 * The image type a file's first bytes show (JPEG, PNG, GIF or WebP), or null for anything else,
 * such as an HTML error page sent with an image content type.
 */
export function sniffPhotoType(bytes: Uint8Array): PhotoExtension | null {
  if (startsWith(bytes, [0xff, 0xd8, 0xff])) return 'jpg'
  if (startsWith(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return 'png'
  // GIF87a or GIF89a.
  if (startsWith(bytes, [0x47, 0x49, 0x46, 0x38, 0x37, 0x61])) return 'gif'
  if (startsWith(bytes, [0x47, 0x49, 0x46, 0x38, 0x39, 0x61])) return 'gif'
  // RIFF, a 4-byte size, then WEBP.
  if (
    startsWith(bytes, [0x52, 0x49, 0x46, 0x46]) &&
    startsWith(bytes, [0x57, 0x45, 0x42, 0x50], 8)
  ) {
    return 'webp'
  }
  return null
}
