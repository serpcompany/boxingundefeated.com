# AGENTS

boxingundefeated.com is a boxing database: about 5,600 boxer profiles with fight histories, weight
division listings, and an Amazon-affiliate shop. It runs as a Next.js OpenNext Worker with D1 and
Drizzle on Cloudflare (cut over from GitHub Pages on 2026-10-06, #19); the remaining plan lives in
the pinned epic, serpcompany/boxingundefeated.com#3.

The SERP-wide standards in
[serpcompany/serp `docs/engineering/standards/`](https://github.com/serpcompany/serp/tree/main/docs/engineering/standards)
apply here unless this file declares an exception. Use this file as a map: read only what the task
needs, then verify against the code.

Stage: explore
Agents may merge: yes

Only the owner changes these two lines. Agents merge once CI is green and a fresh review has no
open blocking findings. The owner merges PRs that change these lines, the finish-gate command, CI
or deploy workflows, or production migrations, plus every release PR, and runs the DNS cutover.

## Where things live

- `apps/web/`: the Next.js app (App Router). Read the parts below before changing pages.
  - `app/`: boxers, divisions, shop, search, brands, legal and HTML sitemap pages. `[...slug]`
    renders shop articles at `/shop/best/<slug>/`.
  - `lib/`: data loaders, URL, metadata, route and XML sitemap (`sitemaps/`) helpers. Change URLs
    here, not in individual pages. Pages read boxers only through `lib/boxer-data/`, which reads
    D1 on request via the server-only, fail-closed `lib/data/`; search calls `/api/search`.
    `lib/site-config.ts` resolves the environment and its origin (Environments below); never read
    `SITE_ENVIRONMENT` or build an origin anywhere else.
  - `content/`: markdown shop articles. The legal pages are TSX in `app/(legal)/`.
  - `public/`: files served at the same path; each needs an extension in
    `lib/routing/file-extensions.ts` (a test checks).
  - `scripts/`: `build:worker` steps: the build's environment and commit
    (`write-build-environment.ts`) and the shop's sitemap entries from `content/`
    (`write-sitemap-content.ts`).
  - `wrangler.jsonc`, `open-next.config.ts`, `worker.ts`: the Worker. The top level is local
    only; `env.staging` (`staging.boxingundefeated.com`) and `env.production` (the apex and `www`)
    are the deployed Workers, each with its own D1 `DB`. `lib/worker/handle-request.ts` maps the
    request pipeline: canonical host, crawl policy, `/api/search` and the XML sitemaps (from D1,
    per the SERP sitemap index pattern), the D1 readiness gate, the edge cache, then OpenNext.
- `d1/`: `drizzle/` migrations (`pnpm db:generate`; never edit `meta/`), `fixtures/`, `reports/`.
- `packages/data-ops/`: the D1 data layer: the Drizzle schema (`src/schema.ts`), types, every
  query the app runs (`src/queries.ts`; the app never writes SQL) and the pipeline importer's
  mapping (`src/import/`). Vitest runs them on an in-memory D1 (Miniflare), migrations applied.
- `packages/design-system/`: shared UI (shadcn). Read before adding a component or helper.
- `configs/`: shared Next.js and TypeScript configuration. Read before changing build settings.
- `scripts/`: `d1/` is the D1 import, parity and deploy checks; `check-frontmatter.ts`.
- `from-pipeline/boxers.json`: the pipeline output (about 104 MB, gitignored), the only boxer
  data source, read only by `db:import` and `db:parity` (in a fresh worktree, pass `--source`).
  Builds read no boxer data.
- `.github/workflows/`: `ci.yml` (the PR check; its `All checks` job is the required check),
  `deploy-staging.yml` and `deploy-production.yml`.

## Commands

Inner loop, while editing (seconds):

- `pnpm --filter web typecheck`
- `pnpm --filter web exec jest <paths>`: the tests for the code you changed.
- `pnpm exec biome lint <paths>`
- `pnpm --filter web exec next dev --port 3003`: the dev server, on the local D1.

Worker (OpenNext on Cloudflare, about a minute; boxer pages read the local D1, so seed it first):

- `pnpm preview:worker`: `build:worker`, then serves the local top level of
  `apps/web/wrangler.jsonc` on http://localhost:8787.
- `pnpm --filter web build:worker:staging` / `build:worker:production`: the Worker build with that
  environment's `SITE_ENVIRONMENT`, which the prerendered HTML needs (Environments below).
- `pnpm --filter web serve:worker [--env staging]`: serve the last Worker build again, with that
  environment's vars and bindings, locally. Pair it with the matching build.
- `pnpm test:e2e`: the smoke suite (`apps/e2e/`; its README has the CI interface) on the local
  preview after `db:reset:local` and `build:worker`; deployed: `BASE_URL=<origin> EXPECT_ENV=<env>`.
- `pnpm parity -- <origin> [--reference <origin>]`: every sitemap URL of the reference (default:
  production) on a candidate, compared.
- Links (CI runs them on the local preview): `pnpm --silent --filter e2e sitemap-urls <origin>`
  into `urls.txt`, then `lychee --config lychee.toml --files-from urls.txt`.
- `pnpm --filter web cf-typegen`: regenerate and commit `cloudflare-env.d.ts` after changing
  `wrangler.jsonc`; it strips the `mainModule` type (`lib/cloudflare-env-types.ts`).

D1 (Drizzle schema in `packages/data-ops`, migrations in `d1/drizzle/`):

- `pnpm --filter @boxingundefeated/data-ops test`: the query and importer tests (seconds).
- `pnpm db:generate`: the migration for a `schema.ts` change (commit both); a re-run reports none.
  It mangles expression indexes: hand-write those (0002 says how). Never `drizzle-kit push`.
- `pnpm db:migrate:local`, `pnpm db:migrations:list:local`: apply or list migrations on the local
  D1 in `apps/web/.wrangler/state`, which the local Worker uses. `pnpm db:reset:local` wipes it,
  migrates and seeds the fixture (`db:seed:local`), in seconds.
- `pnpm db:import -- --target local|staging [--source <json>]`: an idempotent import, then
  `pnpm db:parity -- --target <t>` to prove it. Remote imports cap prunes (`--allow-prune <n>`).
- **Deploy gate:** the Worker reads every boxer page from D1: profiles, listings, divisions, the
  homepage and the HTML sitemap (503 until an import finishes). Deploy to an env only once
  `pnpm db:check-deployable -- --target <env>` passes and `db:parity` is clean there.
- `db:{migrate,migrations:list}:{staging,production}` use `--remote --env <env>`; never `--preview`.
  Production writes (migrate, import) need a protected workflow or the owner's written approval in
  the current task, for that one run, cited in the PR or issue recording it; never your own
  initiative. Run `db:migrate:production`, then `db:import --source <json>`, `db:parity` and
  `db:check-deployable` with `--target production --confirm-production`, then promote.

Finish gate: `pnpm check` (read-only Biome check, workspace check, typecheck, tests and
`next build`). CI (`ci.yml`) runs it on every PR, plus migration validation, the Worker build, the
E2E smoke suite and the link check; CI on the final commit is the record, so don't repeat it
locally. Run it only to reproduce a CI failure, in the background.

## Workflow

- GitHub issues are the plan. The next task is the first open, unblocked sub-issue of the epic.
- Base branch: `staging` (`main` is production). The owner promotes it with a fast-forward:
  `git fetch origin && git push origin origin/staging:main`. Deploys run only in the deploy
  workflows, on pushes to `staging` and `main`; agents never deploy by hand, dispatch a deploy
  workflow, or approve the `production` environment.
- One issue, one `issue-<number>-<slug>` branch, one PR, squash merged. Work in a git worktree per
  issue, and never in a checkout that holds someone else's uncommitted changes.
- PR title: a Conventional Commit describing the outcome a user notices. The body starts with
  `Closes #<number>`, says what is deliberately not included, and reports evidence levels
  separately.
- A fresh agent reviews every PR: one round, and a re-review of the fix commits when the round had
  blocking findings. PRs that don't touch the same files merge in any order. Lockfiles, migrations,
  `next.config.ts` and workflows count as the same files.

## Evidence a PR needs

- Every change: the finish-gate result.
- Routes, redirects, metadata, robots, sitemaps, `next.config.ts` or data loaders: the sitemap
  URL count of a local preview with a full import before and after (`sitemap-urls`), the diff of
  that list, and before/after output for sample URLs.
- Visible UI: one screenshot of each changed page, from a local build or staging.
- Deploy workflows: a link to the deploy run.

## Environments

`SITE_ENVIRONMENT` is `local`, `staging` or `production`, and only `production` is indexable and
loads Google Tag Manager. `apps/web/lib/site-config.ts` resolves it, reading `process.env` when a
value is used, never at module load. A missing or unknown value is `local`.

| | local | staging | production |
| --- | --- | --- | --- |
| Origin (canonicals, JSON-LD, sitemaps) | `http://localhost:<PORT or 8787>` | `https://staging.boxingundefeated.com` | `https://boxingundefeated.com` |
| `<meta name="robots">`, `X-Robots-Tag` | `noindex` | `noindex` | none |
| `/robots.txt` | `Disallow: /` | `Disallow: /` | `Allow: /` and the sitemap index |
| Google Tag Manager | no | no | `GTM-PP4HWLM` (in code) |
| `CANONICAL_HOST_REDIRECT` (`www`, `*.workers.dev` -> origin) | `off` | `on` | `on` |

Prerendered HTML is fixed at build, so a Worker build and the environment that serves it must use
the same value (`build:worker:staging` with `--env staging`); on a mismatch the Worker answers 503
to everything and deploys refuse it (`lib/worker/build-environment.ts`). At runtime, unless the
`wrangler.jsonc` var is exactly `production`, `worker.ts` sends `X-Robots-Tag: noindex` and
answers `/robots.txt` with `Disallow: /`. `app/robots.ts` is the only robots source.

## Invariants

- Public URLs are an SEO contract. Never change or drop one without a permanent redirect, which
  the Worker serves (`lib/routing/`, `next.config.ts` redirects).
- Pages end in a trailing slash, files never do, and the homepage canonical is the origin without
  a slash (SERP URL trailing-slash standard). `lib/routing/trailing-slash.ts` holds the rules; the
  Worker redirects with them. The homepage renders its own canonical and `og:url`, so the root
  layout sets neither. Host redirects exempt requests with the
  `x-boxingundefeated-smoke-test` header, and `/api` paths keep their exact path.
- Exception to the canonical-host rule: hashed build output under `/_next/static/` is served
  before the Worker runs (`assets.run_worker_first`), so `www` and `*.workers.dev` answer it with
  200 instead of a 308. Crawlers don't index it, and routing it through the Worker would bill an
  invocation for every chunk of every page view. Every other path, pages and `public/` files,
  gets the host redirect and the crawl policy.
- Never commit secrets. `.env.local` files are local only.
