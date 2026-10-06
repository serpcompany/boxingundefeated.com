# AGENTS

boxingundefeated.com is a boxing database: about 5,600 boxer profiles with fight histories, weight
division listings, and an Amazon-affiliate shop. Today it is a Next.js static export deployed to
GitHub Pages. It is migrating to a Next.js OpenNext Worker with D1 and Drizzle on Cloudflare; the
plan and its order live in the pinned epic, serpcompany/boxingundefeated.com#3.

The SERP-wide standards in
[serpcompany/serp `docs/engineering/standards/`](https://github.com/serpcompany/serp/tree/main/docs/engineering/standards)
apply here unless this file declares an exception. Use this file as a map: read only what the task
needs, then verify against the code.

Stage: explore
Agents may merge: yes

The owner set both lines on 2026-10-06. Only the owner changes them. Agents merge once CI is green
and a fresh review has no open blocking findings. The owner merges PRs that change these lines,
the finish-gate command, CI or deploy workflows, or production migrations, plus every release PR.
The owner runs the production DNS cutover.

## Where things live

- `apps/web/`: the Next.js app (App Router). Read its `app/` routes, `lib/` helpers and `content/`
  before changing pages.
  - `app/`: boxers, divisions, shop, search, brands, legal and HTML sitemap pages. `[...slug]`
    renders shop articles at `/shop/best/<slug>/`.
  - `lib/`: data loaders, URL, metadata, route and sitemap-path helpers. Change URLs here, not in
    individual pages. Pages read boxers only through `lib/boxer-data/`: D1 via the server-only,
    fail-closed `lib/data/` in the Worker, the committed JSON in the static export (until #20).
    `lib/site-config.ts` resolves the environment and its origin (Environments below); never read
    `SITE_ENVIRONMENT` or build an origin anywhere else.
  - `content/`: markdown shop articles. The legal pages are TSX in `app/(legal)/`.
  - `public/data/boxers/`: per-boxer JSON generated from the pipeline data. Never hand-edit it.
  - `scripts/`: data generators. The search index is built before `next build` (`predev`,
    `build:with-data`); XML sitemaps are written after it and rewrite files in `public/`, so
    revert those changes before committing.
  - `wrangler.jsonc`, `open-next.config.ts`, `worker.ts`: the Worker. The top level is local only;
    `env.staging` and `env.production` are the deployed Workers, each with its own D1 `DB`.
    `worker.ts` is the entry: the crawl policy, the edge cache, then OpenNext (`lib/worker/`).
    Caching decision: `lib/worker/edge-cache.ts` (per data center, Worker version, one-hour TTL).
- `d1/`: `drizzle/` migrations (`pnpm db:generate`; never edit `meta/`), `fixtures/`, `reports/`.
- `packages/data-ops/`: the D1 data layer: the Drizzle schema (`src/schema.ts`), types, every
  query the app runs (`src/queries.ts`; the app never writes SQL) and the pipeline importer's
  mapping (`src/import/`). Vitest runs them on an in-memory D1 (Miniflare), migrations applied.
- `packages/design-system/`: shared UI (shadcn). Read before adding a component or helper.
- `configs/`: shared Next.js and TypeScript configuration. Read before changing build settings.
- `scripts/`: `split-boxer-data.js` writes `apps/web/public/data/boxers/`; `d1/` is the D1 import.
- `from-pipeline/boxers.json`: the pipeline output (about 104 MB, gitignored), read only by data
  regeneration and `db:import`; builds read `public/data/`. In a fresh worktree, copy it there,
  then `mkdir -p apps/web/data && ln -s ../../../from-pipeline/boxers.json apps/web/data/`.
- `.github/workflows/`: `deploy-github-pages.yml` deploys `main` to production, `pr-review.yml`
  runs PR checks, `preview.yml` publishes PR previews.

## Commands

Inner loop, while editing (seconds):

- `pnpm --filter web typecheck`
- `pnpm --filter web exec jest <paths>`: the tests for the code you changed.
- `pnpm exec biome lint <paths>`
- `pnpm --filter web exec next dev --port 3003`: the dev server. `pnpm dev` first runs `predev`,
  which regenerates `public/data/` and needs `apps/web/data/boxers.json`.

Worker (OpenNext on Cloudflare, about a minute; profiles read the local D1, so seed it first):

- `pnpm preview:worker`: `build:worker` (`opennextjs-cloudflare build` with
  `NEXT_BUILD_TARGET=worker`, which turns off `output: 'export'`), then serves the local Worker on
  http://localhost:8787 with the local top level of `apps/web/wrangler.jsonc`.
- `pnpm --filter web build:worker:staging` / `build:worker:production`: the Worker build with that
  environment's `SITE_ENVIRONMENT`, which the prerendered HTML needs (Environments below).
- `pnpm --filter web serve:worker [--env staging]`: serve the last Worker build again. With
  `--env`, it uses that environment's vars and bindings, locally. Pair it with the matching build.
  It sets `CHOKIDAR_USEPOLLING`: Wrangler's per-file watchers exhaust macOS file descriptors.
- `pnpm --filter web cf-typegen`: regenerate `cloudflare-env.d.ts` after changing
  `wrangler.jsonc`, and commit it.

D1 (Drizzle schema in `packages/data-ops`, migrations in `d1/drizzle/`):

- `pnpm --filter @boxingundefeated/data-ops test`: the query and importer tests (seconds).
- `pnpm db:generate`: after changing `schema.ts`, write the next migration; commit it with the
  schema. Re-running it on an unchanged schema must report no changes. Never `drizzle-kit push`.
- `pnpm db:migrate:local`, `pnpm db:migrations:list:local`: apply or list migrations on the local
  D1 in `apps/web/.wrangler/state`, which the local Worker uses. `pnpm db:reset:local` wipes it,
  migrates and seeds the fixture (`db:seed:local`), in seconds.
- `pnpm db:import -- --target local|staging [--source <json>]`: an idempotent import, then
  `pnpm db:parity -- --target <t>` to prove it. Production imports run via the owner or CI.
- `db:migrate:{staging,production}` and `db:migrations:list:{staging,production}` target the
  remote databases with `--remote --env <env>`. Never use `--preview`. Only the owner, or a
  protected workflow, migrates production.

Finish gate, once per state when the branch is finished: `pnpm check` (read-only Biome check,
workspace check, typecheck, tests and the production build; about a minute for the build). Run it
in the background. Don't re-run it on an unchanged tree; cite the earlier run. The build rewrites
the committed sitemap files' dates, so run `git checkout -- apps/web/public` before committing.

## Workflow

- GitHub issues are the plan. The next task is the first open, unblocked sub-issue of the epic.
- Base branch: `main`, until the staging deploy issue makes `staging` the base branch.
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
- Routes, redirects, metadata, robots, sitemaps, `next.config.ts` or data loaders: the HTML page
  count of `apps/web/out` before and after, the diff of the page list, and before/after output for
  sample URLs.
- Visible UI: one screenshot of each changed page, from the PR preview (`preview.yml`) or a local
  build.
- Deploy workflows: a link to the deploy run.

## Environments

`SITE_ENVIRONMENT` is `local`, `staging` or `production`, and only `production` is indexable and
loads Google Tag Manager. `apps/web/lib/site-config.ts` resolves it, reading `process.env` when a
value is used, never at module load:

1. An explicit `SITE_ENVIRONMENT` wins; an unknown value is `local`.
2. Without one, the static export (`next build` with `output: 'export'`) is production, unless
   `GITHUB_EVENT_NAME` is `pull_request` (the Surge previews). This keeps the GitHub Pages
   deploy, which sets no `SITE_ENVIRONMENT`, indexable.
3. Everything else is `local`: `next dev`, tests, a Worker build without the variable, and a
   Worker whose runtime var is missing.

| | local | staging | production |
| --- | --- | --- | --- |
| Origin (canonicals, JSON-LD, sitemaps) | `http://localhost:<PORT or 8787>` | `https://staging.boxingundefeated.com` | `https://boxingundefeated.com` |
| `<meta name="robots">`, `X-Robots-Tag` | `noindex` | `noindex` | none |
| `/robots.txt` | `Disallow: /` | `Disallow: /` | `Allow: /` and the sitemap index |
| Google Tag Manager | no | no | `GTM-PP4HWLM` (in code) |

Prerendered HTML is fixed at build, so a Worker build and the environment that serves it must use
the same value: `build:worker:staging` with `--env staging`. At runtime, `worker.ts` reads the
`wrangler.jsonc` var and, unless it is exactly `production`, sends `X-Robots-Tag: noindex` and
answers `/robots.txt` with `Disallow: /`. `app/robots.ts` is the only robots source.

## Invariants

- Public URLs are an SEO contract. Never change or drop one without a permanent redirect. GitHub
  Pages can't serve redirects, so until the Worker cutover, don't change URLs at all.
- Pages end in a trailing slash, files never do, and the homepage canonical is the origin without
  a slash (SERP URL trailing-slash standard).
- Never commit secrets. `.env.local` files are local only.
