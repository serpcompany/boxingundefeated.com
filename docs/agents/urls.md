# URLs

Public URLs are an SEO contract. Read this before changing a route, redirect, canonical, sitemap
or file under `apps/web/public/`. The SERP
[URL trailing-slash](https://github.com/serpcompany/serp/blob/main/docs/engineering/standards/url-trailing-slash.md)
standard applies.

## Rules

- Never change or drop a public URL without a permanent redirect, which the Worker serves
  (`apps/web/lib/routing/`, `next.config.ts` redirects), unless the owner retires it with a 410
  ([Retired URLs](#retired-urls)). Change URLs in `apps/web/lib/`, not in individual pages.
- Pages end in a trailing slash, files never do, and the homepage canonical is the origin without
  a slash. `lib/routing/trailing-slash.ts` holds the rules; the Worker redirects with them. The
  homepage renders its own canonical and `og:url`, so the root layout sets neither.
- Host redirects exempt requests with the `x-boxingundefeated-smoke-test` header, and `/api` paths
  keep their exact path.
- Every file in `apps/web/public/` is served at the same path and needs its extension in
  `lib/routing/file-extensions.ts` (a test checks).

## Retired URLs

A section the owner removes without a replacement answers **410 Gone** instead of a redirect:
`/blog` and `/brands` (#59) and `/shop` (#94), each with every path under it in any spelling
(non-ASCII, repeated slashes), and the file `/sitemap-shop.xml`. `lib/routing/retired-paths.ts`
holds the list; add later retirements there, and drop their links and sitemap entries. The Worker
answers the 410 after staging's password and the canonical-host 308, and before the XML sitemaps,
the edge cache and the trailing-slash redirects: a small page with `noindex` and
`Cache-Control: no-store`. On the production apex the shared brands Worker answers `/brands*`
first until serpcompany/serp#1490 is deployed: `/brands` gets its 308 to `/brands/`, which passes
the 410 through.

## The `/_next/static/` exception

Exception to the canonical-host rule: hashed build output under `/_next/static/` is served
before the Worker runs (`assets.run_worker_first`), so `www` and `*.workers.dev` answer it with
200 instead of a 308. Crawlers don't index it, and routing it through the Worker would bill an
invocation for every chunk of every page view. Every other path, pages and `public/` files,
gets the host redirect and the crawl policy.
