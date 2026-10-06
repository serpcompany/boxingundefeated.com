/**
 * The trailing-slash rules of the SERP URL standard (serpcompany/serp
 * `docs/engineering/standards/url-trailing-slash.md`, "Example: Next.js"):
 *
 * - a page ends with a slash: `/about` -> `/about/`;
 * - a file never does: `/robots.txt/` -> `/robots.txt`;
 * - `/api` and everything under it, `/.well-known/` and segments starting with `_` (`/_next/`)
 *   are served exactly as requested.
 *
 * `slashRedirects` is what next.config.ts `redirects()` returns in the Worker build. The static
 * export can't serve redirects, so it doesn't use them. `canonicalPathname` is the same rule as
 * a function, for the canonical-host redirect in `worker.ts`, which runs before OpenNext and must
 * send a non-canonical host straight to the canonical path in one hop. The unit tests compile
 * `slashRedirects` with Next.js's own route compiler and check that both agree.
 *
 * A file is a last segment that ends in a known extension (`file-extensions.ts`), not any dotted
 * segment: shop slugs such as `2.7-l-water-bottles` are pages, so `/shop/best/2.7-l-water-bottles`
 * gets its slash. This module has no Next.js imports: the Worker entry loads it before OpenNext.
 */
import { FILE_EXTENSION_PATTERN, hasFileExtension } from './file-extensions'

// Segments that are never pages: anything starting with `_` (/_next/), /.well-known/, and /api.
// The lookbehind limits the api exclusion to the first segment, so /docs/api is still a page.
// Both exclusions spell out upper and lower case because OpenNext tests the pattern
// case-sensitively but fills its parameters case-insensitively; this makes /API and
// /.WELL-KNOWN/ behave the same in both runtimes.
const notPage = '_|(?<=^/)[Aa][Pp][Ii](?:/|$)|\\.[Ww][Ee][Ll][Ll]-[Kk][Nn][Oo][Ww][Nn](?:/|$)'
const file = `[^/]+\\.${FILE_EXTENSION_PATTERN}`
// Next.js lets every custom source also match with a trailing slash, so a page pattern must
// refuse slashed paths itself, or /about/ would redirect to itself. A dotted segment is a page
// unless it ends in a file extension.
const unslashedPage = `(?:(?!${notPage}|.*/$|[^/]*\\.${FILE_EXTENSION_PATTERN}$)[^/]+)`
const pageDir = `(?:(?!${notPage})[^/]+)`

export interface SlashRedirect {
  source: string
  destination: string
  permanent: true
}

// Two rules per shape, because OpenNext cannot fill an empty path parameter.
export const slashRedirects: readonly SlashRedirect[] = [
  // Files never end in a slash: /robots.txt/ -> /robots.txt
  { source: `/:file(${file})/`, destination: '/:file', permanent: true },
  { source: `/:dir(${pageDir})+/:file(${file})/`, destination: '/:dir+/:file', permanent: true },
  // Pages always do: /about -> /about/
  { source: `/:page(${unslashedPage})`, destination: '/:page/', permanent: true },
  {
    source: `/:dir(${pageDir})+/:page(${unslashedPage})`,
    destination: '/:dir+/:page/',
    permanent: true
  }
]

/** A segment `file` accepts: a name, then a known extension. */
function isFile(segment: string): boolean {
  return segment.lastIndexOf('.') > 0 && hasFileExtension(segment)
}

/** A segment `pageDir` accepts at `index`: not `_*`, not a first-segment `api`, not `.well-known`. */
function isPageDir(segment: string, index: number): boolean {
  const lower = segment.toLowerCase()
  return !segment.startsWith('_') && !(index === 0 && lower === 'api') && lower !== '.well-known'
}

/**
 * The path `slashRedirects` sends `pathname` to, or `pathname` itself when no rule matches: the
 * homepage, canonical paths, `/api` and its subpaths, `/.well-known/` and `_*` segments, and
 * shapes neither rule covers (empty segments, or a last segment such as `.json` that is neither
 * a page nor a file). The host redirect in `worker.ts` relies on this to keep `/api` paths
 * exactly as requested.
 */
export function canonicalPathname(pathname: string): string {
  if (pathname === '/' || !pathname.startsWith('/') || pathname.includes('//')) {
    return pathname
  }

  const slashed = pathname.endsWith('/')
  const segments = pathname.slice(1, slashed ? -1 : undefined).split('/')
  const last = segments[segments.length - 1]
  const dirsArePages = segments.slice(0, -1).every(isPageDir)

  if (!dirsArePages) {
    return pathname
  }
  // Files never end in a slash.
  if (slashed && isFile(last)) {
    return pathname.slice(0, -1)
  }
  // Pages always do. A dotted last segment is a page unless it ends in a file extension.
  if (!slashed && !hasFileExtension(last) && isPageDir(last, segments.length - 1)) {
    return `${pathname}/`
  }
  return pathname
}
