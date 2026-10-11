/**
 * Shop paths with non-ASCII letters (#53): `/shop/best/brümate-water-bottles/` and
 * `/shop/best/nestlé-water-bottles/`. They keep their URLs, are served at one spelling, and every
 * other spelling of them redirects there in one hop.
 *
 * - The canonical spelling (`encodePath`): NFC, with each non-ASCII character percent-encoded as
 *   UTF-8 in uppercase hex, `/shop/best/br%C3%BCmate-water-bottles/`. Canonicals, JSON-LD and the
 *   sitemap use it, and browsers send it for a link to the page.
 * - Any other spelling of such a path gets one 308 to the canonical one, with the trailing slash
 *   fixed and repeated slashes collapsed in the same hop (`canonicalShopPathname`): NFD
 *   (`bru%CC%88mate`), lowercase hex, raw UTF-8 (which workerd passes on as lowercase hex), a
 *   route key, a missing slash, or `//` (which OpenNext would otherwise collapse in a second
 *   redirect, to the route key).
 * - Route keys (`routeKeyPath`): OpenNext's `handleFallbackFalse` (@opennextjs/aws 4.1.x) compares
 *   the request's percent-encoded path with the decoded paths of the prerender manifest, so in a
 *   route with `dynamicParams = false` a prerendered page whose path has non-ASCII characters is a
 *   404 on the Worker, whatever the page does. Each such article is also prerendered at an ASCII
 *   route key, its canonical spelling with `~` for `%` (`/shop/best/br~C3~BCmate-water-bottles/`),
 *   and the Worker renders the canonical URL from it (lib/worker/handle-request.ts). Drop route
 *   keys once OpenNext matches decoded paths there.
 *
 * Only `/shop/` paths: shop articles are the only pages with such slugs (every boxer and division
 * slug is ASCII). No Next.js imports: the Worker runs this before OpenNext.
 */
import { canonicalPathname } from './trailing-slash'

const SHOP_PREFIX = '/shop/'
/** A non-ASCII character, as a code point: a surrogate pair is one, never split. */
const NON_ASCII = /\P{ASCII}/u
const NON_ASCII_RUN = /\P{ASCII}+/gu
/** Percent-encoded bytes from 0x80 up, which only non-ASCII characters have in UTF-8, any case. */
const NON_ASCII_ESCAPES = /(?:%[89a-f][0-9a-f])+/gi
/** The same bytes as a route key writes them. */
const ROUTE_KEY_ESCAPES = /(?:~[89a-f][0-9a-f])+/gi
const ESCAPED = /%[89a-f][0-9a-f]|~[89a-f][0-9a-f]/i

/**
 * `path` as it goes in a URL: NFC, with each non-ASCII character percent-encoded (uppercase hex).
 * ASCII, `%` escapes included, is kept as it is, so an encoded path comes back unchanged.
 */
export function encodePath(path: string): string {
  return path.normalize('NFC').replace(NON_ASCII_RUN, run => encodeURIComponent(run))
}

/** `path` with its route-key and percent-encoded non-ASCII bytes decoded, or null if malformed. */
function decodeNonAscii(path: string): string | null {
  let malformed = false
  const decoded = path
    .replace(ROUTE_KEY_ESCAPES, run => run.replaceAll('~', '%'))
    .replace(NON_ASCII_ESCAPES, run => {
      try {
        return decodeURIComponent(run)
      } catch {
        malformed = true
        return run
      }
    })
  return malformed ? null : decoded.normalize('NFC')
}

/**
 * The page path a request path or a route key stands for, decoded and in NFC
 * (`/shop/best/brümate-water-bottles/`), for looking the page up. A malformed path is returned as
 * it is.
 */
export function decodePagePath(path: string): string {
  return decodeNonAscii(path) ?? path
}

/**
 * The ASCII path a page is prerendered at for the Worker: for a path with non-ASCII characters,
 * its canonical spelling with `~` for `%` (`/shop/best/br~C3~BCmate-water-bottles/`); any other
 * path is its own route key.
 */
export function routeKeyPath(path: string): string {
  return encodePath(path).replace(NON_ASCII_ESCAPES, run => run.replaceAll('%', '~'))
}

/**
 * The canonical spelling of a `/shop/` request path whose decoded form has non-ASCII characters,
 * repeated slashes collapsed and slash rule included, or null for any other path (ASCII or
 * malformed), which is left alone. The Worker answers a 308 when the request's spelling differs,
 * and renders the route key otherwise.
 */
export function canonicalShopPathname(pathname: string): string | null {
  const collapsed = pathname.replace(/\/{2,}/g, '/')
  if (
    !collapsed.startsWith(SHOP_PREFIX) ||
    !(ESCAPED.test(collapsed) || NON_ASCII.test(collapsed))
  ) {
    return null
  }
  const decoded = decodeNonAscii(collapsed)
  if (decoded === null || !NON_ASCII.test(decoded)) return null
  return canonicalPathname(encodePath(decoded))
}
