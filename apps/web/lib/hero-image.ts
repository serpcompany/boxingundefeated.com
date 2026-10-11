/**
 * Shop article heroes are animated images in Cloudflare Images, linked from the articles'
 * frontmatter through a flexible variant (`https://imagedelivery.net/<hash>/<id>/w=900,h=500,…`).
 * Delivered as they are, each is 0.5 to 7 MB of animated WebP (5 to 16 MB of GIF): a slow camera
 * drift over one picture. The same image as a still (`anim=false`: its first frame) is 10 to
 * 110 KB at the same size, and Cloudflare Images picks AVIF, WebP or JPEG from the browser's
 * `Accept` header.
 *
 * `resizeHeroImage` maps a hero to that still at the widths a layout needs, never wider than the
 * hero's own variant, and each width keeps the variant's aspect ratio. Any other URL gets `null`:
 * show it as it is.
 */

const IMAGE_DELIVERY_ORIGIN = 'https://imagedelivery.net'

/** The widths a hero is offered at, up to its variant's own width. */
export const HERO_WIDTHS = [360, 540, 720, 900] as const

/** Options a still sets itself, so they are dropped from the hero's own variant. */
const REPLACED_OPTIONS = new Set(['w', 'width', 'h', 'height', 'anim', 'format', 'f'])

export interface ResizedHeroImage {
  /** The still at the variant's own size. */
  src: string
  /** The still at each of `HERO_WIDTHS` up to the variant's own width. */
  srcSet: string
  /** The variant's own size, which `src` has. */
  width: number
  height: number
}

export function resizeHeroImage(url: string): ResizedHeroImage | null {
  let parsed: URL
  try {
    parsed = new URL(url)
  } catch {
    return null
  }
  if (parsed.origin !== IMAGE_DELIVERY_ORIGIN || parsed.search || parsed.hash) return null

  const [, accountHash, imageId, variant, ...rest] = parsed.pathname.split('/')
  if (!accountHash || !imageId || !variant || rest.length > 0) return null

  // A flexible variant is a list of `key=value` options. A named variant (`public`) has no size
  // to keep, so it stays as it is.
  const options = variant.split(',').map(option => option.split('='))
  if (options.some(option => option.length !== 2 || !option[0] || !option[1])) return null
  const option = (...keys: string[]) => options.find(([key]) => keys.includes(key))?.[1]
  const width = Number(option('w', 'width'))
  const height = Number(option('h', 'height'))
  if (!isPositiveInteger(width) || !isPositiveInteger(height)) return null

  const kept = options
    .filter(([key]) => !REPLACED_OPTIONS.has(key))
    .map(([key, value]) => `${key}=${value}`)
  const stillAt = (w: number) => {
    const still = [`w=${w}`, `h=${Math.round((height * w) / width)}`, ...kept, 'anim=false']
    return `${IMAGE_DELIVERY_ORIGIN}/${accountHash}/${imageId}/${still.join(',')}`
  }

  const widths = [...HERO_WIDTHS.filter(w => w < width), width]
  return {
    src: stillAt(width),
    srcSet: widths.map(w => `${stillAt(w)} ${w}w`).join(', '),
    width,
    height
  }
}

function isPositiveInteger(value: number): boolean {
  return Number.isInteger(value) && value > 0
}
