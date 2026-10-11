# Worker

The site runs as a Next.js OpenNext Worker on Cloudflare. Read this before changing
`apps/web/wrangler.jsonc`, `open-next.config.ts`, `worker.ts` or `lib/worker/`, before building or
previewing the Worker, and when something works in `next dev` but not on the Worker. What each
environment sets is in [environments.md](environments.md).

## Files

- `apps/web/wrangler.jsonc`, `open-next.config.ts`, `worker.ts`: the Worker. The top level of
  `wrangler.jsonc` is local only; `env.staging` (`staging.boxingundefeated.com`) and
  `env.production` (the apex and `www`) are the deployed Workers, each with its own D1 `DB` and a
  `WORKER_SELF_REFERENCE` binding to itself. Every env inherits `global_fetch_strictly_public`
  and `upload_source_maps` from the top level.
- `apps/web/lib/worker/handle-request.ts` maps the request pipeline, in order: the build guard,
  staging's password gate, the canonical host, then the crawl policy, which wraps the retired
  paths' 410 ([urls.md](urls.md#retired-urls)), `/api/search` and the XML sitemaps (from D1, per
  the SERP sitemap index pattern), the D1 readiness gate, the edge cache and the not-found page,
  and finally OpenNext.
  - The password gate runs on every host of the staging Worker, before the canonical-host
    redirect: `*.workers.dev` without the password answers 401, not 308, and it is the only host
    CI can reach (#45). A request that passes loses its `Authorization` header, so the edge cache
    stores and serves it like an anonymous one. Smoke-test requests and `/robots.txt` are exempt,
    and there are no webhook exemptions ([environments.md](environments.md#stagings-password)).
  - The crawl policy sits outside the cache, so each response's `noindex` is decided per request.
  - `notFound()` in a D1 page leaves OpenNext's empty `__next_error__` document; the Worker sends
    the prerendered `/_not-found` page's body instead, still a 404 (`lib/worker/not-found-page.ts`).

## Commands

Worker builds take about a minute. Boxer pages read the local D1, so seed it first
(`pnpm db:reset:local`, see [d1.md](d1.md)).

- `pnpm preview:worker`: `build:worker`, then serves the local top level of
  `apps/web/wrangler.jsonc` on http://localhost:8787.
- `pnpm --filter web build:worker:staging` / `build:worker:production`: the Worker build with that
  environment's `SITE_ENVIRONMENT`, which the prerendered HTML needs
  ([environments.md](environments.md)).
- `pnpm --filter web serve:worker [--env staging]`: serve the last Worker build again, with that
  environment's vars and bindings, locally. Pair it with the matching build.
- `pnpm test:e2e`: the smoke suite (`apps/e2e/`; its README has the CI interface) on the local
  preview after `db:reset:local` and `build:worker`; deployed: `BASE_URL=<origin> EXPECT_ENV=<env>`.
  CI runs it on the local build and on the staging build served with `env.staging`'s vars on the
  local top level (the README's staging recipe), where the password's 200 path is reachable.
- `pnpm parity -- <origin> [--reference <origin>]`: every sitemap URL of the reference (default:
  production) on a candidate, compared.
- Links (CI runs them on the local preview): `pnpm --silent --filter e2e sitemap-urls <origin>`
  into `urls.txt`, then `lychee --config lychee.toml --files-from urls.txt`.
- `pnpm --filter web cf-typegen`: regenerate and commit `cloudflare-env.d.ts` after changing
  `wrangler.jsonc`; it strips the `mainModule` type (`lib/cloudflare-env-types.ts`).
