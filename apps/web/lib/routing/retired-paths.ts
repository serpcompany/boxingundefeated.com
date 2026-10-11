/**
 * Retired URLs (#59, #94): what the owner removed without a replacement, so it answers
 * **410 Gone** instead of the permanent redirect every other changed URL gets (docs/agents/urls.md).
 * A 410 tells search engines the page is gone for good, and visitors get a small page that says so
 * and links home. Add a later retirement to `RETIRED_SECTIONS` or `RETIRED_FILES`; nothing else
 * needs to change.
 *
 * A section is a path prefix: the path itself, with or without its slash, and everything under it,
 * so `/blog`, `/blog/` and `/blog/jab/` are gone, while `/blogs/` and `/Blog/` stay unknown paths
 * (404). Whole sections rather than a list of URLs, because the old site's blog was WordPress:
 * posts plus author, category and tag archives with pagination (56 paths in the Wayback Machine,
 * every one under `/blog/`), and crawlers know variants the archive never saw. The shop's articles
 * include spellings with non-ASCII letters (`/shop/best/br%C3%BCmate-water-bottles/`, NFD,
 * lowercase hex); every one of them is under `/shop/`, so each is gone as it was sent. A file is
 * one path, with or without a trailing slash. Repeated slashes count as one (`//shop/`), so no
 * spelling needs a redirect first.
 *
 * lib/worker/handle-request.ts answers it after staging's password and the canonical-host
 * redirect (`www` and `*.workers.dev` still get their one 308 to the origin first), and before the
 * XML sitemaps, the edge cache and OpenNext's trailing-slash redirects, so `/blog` answers 410
 * without a hop and the 410 is never stored as a page. The response carries its own `noindex`
 * (header and meta tag), because production's crawl policy adds none, and neither does staging's
 * for a request with the password.
 *
 * No Next.js imports: the Worker runs this before OpenNext loads.
 */
import { SITE_NAME } from '../site-config'

export interface RetiredPath {
  /** The path without a trailing slash, such as `/blog` or `/sitemap-shop.xml`. */
  path: string
  /** Why it is gone, and who decided. */
  reason: string
}

export const RETIRED_SECTIONS: readonly RetiredPath[] = [
  {
    path: '/blog',
    reason:
      'An empty listing here ("No blog posts yet"); the old WordPress blog\'s posts and archives ' +
      'lived under it. Owner: "Drop from nav, 410 the URL" (#59).'
  },
  {
    path: '/brands',
    reason:
      'Owner, 2026-10-11: "actually lets just remove the brands page." (#59). The shared ' +
      "brands Worker's route there goes in serpcompany/serp#1490."
  },
  {
    path: '/shop',
    reason:
      'Amazon-affiliate buying guides: `/shop/`, its listing pages and 627 articles under ' +
      '`/shop/best/`. Owner, 2026-10-11: drop the whole shop, "its super outdated" (#94).'
  }
]

/** Single retired paths, not prefixes. */
export const RETIRED_FILES: readonly RetiredPath[] = [
  {
    path: '/sitemap-shop.xml',
    reason: "The shop's XML sitemap, which the sitemap index no longer lists (#94)."
  }
]

/**
 * True for a retired section's path and every path under it, and for a retired file with or
 * without a trailing slash, with repeated slashes counted as one (case-sensitive, as routes are).
 */
export function isRetiredPath(pathname: string): boolean {
  const path = pathname.replace(/\/{2,}/g, '/')
  const inSection = RETIRED_SECTIONS.some(
    section => path === section.path || path.startsWith(`${section.path}/`)
  )
  return inSection || RETIRED_FILES.some(file => path === file.path || path === `${file.path}/`)
}

const GONE_PAGE = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<title>Page Gone - ${SITE_NAME}</title>
<style>body{font-family:system-ui,sans-serif;line-height:1.5;max-width:36rem;margin:4rem auto;padding:0 1rem}</style>
</head>
<body>
<h1>Page Gone</h1>
<p>This page has been removed from ${SITE_NAME} for good.</p>
<p><a href="/">Back to homepage</a></p>
</body>
</html>
`

/**
 * The 410 for a retired path, or null for any other path. Every method gets it (`HEAD` without a
 * body). `no-store`, like the Worker's other non-200 answers, so neither the browser nor any cache
 * keeps it.
 */
export function retiredPathResponse(request: Request): Response | null {
  if (!isRetiredPath(new URL(request.url).pathname)) return null
  return new Response(request.method === 'HEAD' ? null : GONE_PAGE, {
    status: 410,
    headers: {
      'cache-control': 'no-store',
      'content-type': 'text/html; charset=utf-8',
      'x-robots-tag': 'noindex'
    }
  })
}
