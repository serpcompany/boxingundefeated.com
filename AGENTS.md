# AGENTS

boxingundefeated.com is a boxing database: about 5,600 boxer profiles with fight histories, weight
division listings, and an Amazon-affiliate shop. It runs as a Next.js OpenNext Worker with D1 and
Drizzle on Cloudflare (cut over from GitHub Pages on 2026-10-06, #19); the remaining plan lives in
the pinned epic, serpcompany/boxingundefeated.com#3.

The SERP-wide standards in
[serpcompany/serp `docs/engineering/standards/`](https://github.com/serpcompany/serp/tree/main/docs/engineering/standards)
apply here unless [Exceptions](#exceptions) declares otherwise. Use this file as a map: read only
what the task needs, then verify against the code.

Stage: ship
Agents may merge: listed paths

- `apps/web/content/**`: the markdown shop articles.

Only the owner changes these two lines and the list. An agent merges a PR only when every file
it changes is on the list (deleted and renamed files count), it adds no redirect and removes,
renames or moves no linked article, and changes no article's `slug:` (or file name, when it has
no `slug:`), which sets its public URL (`lib/shop-loader.ts` reads `slug:` first); one at a time,
up to date with `staging`, with CI green, a clean review and the last staging deploy passed. The
owner merges the rest, including workflows, the finish gate, migrations and releases, and runs
DNS changes. Rules, auto-merge included:
[Verification Cadence](https://github.com/serpcompany/serp/blob/main/docs/engineering/standards/verification-cadence.md#merging-and-deploys).

## Where things live

- `apps/web/`: the Next.js app (App Router). Read the parts below before changing pages.
  - `app/`: boxers, divisions, shop, search, brands, legal and HTML sitemap pages. `[...slug]`
    renders shop articles at `/shop/best/<slug>/`.
  - `lib/`: data loaders, URL, metadata, route and XML sitemap (`sitemaps/`) helpers. Pages read
    boxers only through `lib/boxer-data/`, which reads D1 on request via the server-only,
    fail-closed `lib/data/`; search calls `/api/search`. `lib/site-config.ts` alone resolves the
    environment and origin; [environments.md](docs/agents/environments.md) has what each serves.
  - `content/`: markdown shop articles. The legal pages are TSX in `app/(legal)/`.
  - `public/`: files served at the same path ([urls.md](docs/agents/urls.md)).
  - `scripts/`: `build:worker` steps: the build's environment and commit
    (`write-build-environment.ts`) and the shop's sitemap entries from `content/`
    (`write-sitemap-content.ts`).
  - `wrangler.jsonc`, `open-next.config.ts`, `worker.ts`, `lib/worker/`: the Worker. Its request
    pipeline and build, preview, E2E, parity and link commands: [worker.md](docs/agents/worker.md).
- `d1/`: `drizzle/` migrations, `fixtures/`, `reports/`. [d1.md](docs/agents/d1.md): the boxer data
  source (`from-pipeline/`), migrations, imports, the deploy gate and production writes.
- `packages/data-ops/`: the D1 data layer: the Drizzle schema (`src/schema.ts`), types, every
  query the app runs (`src/queries.ts`; the app never writes SQL) and the pipeline importer's
  mapping (`src/import/`). Vitest runs them on an in-memory D1 (Miniflare), migrations applied.
- `packages/design-system/`: shared UI (shadcn). Read before adding a component or helper.
- `configs/`: shared Next.js and TypeScript configuration. Read before changing build settings.
- `apps/e2e/`: the Playwright smoke suite, the sitemap URL lister and the parity check.
- `scripts/`: `d1/` is the D1 import, parity and deploy checks; `check-frontmatter.ts`.
- `.github/workflows/`: `ci.yml` (the PR check; its `All checks` job is the required check),
  `deploy-staging.yml` and `deploy-production.yml`.

## Commands

Inner loop, while editing (seconds):

- `pnpm --filter web typecheck`
- `pnpm --filter web exec jest <paths>`: the tests for the code you changed.
- `pnpm --filter @boxingundefeated/data-ops test`: the query and importer tests.
- `pnpm exec biome lint <paths>`
- `pnpm --filter web exec next dev --port 3003`: the dev server, on the local D1. `/api/search`
  and the XML sitemaps are answered only by the Worker, so search fails here; use
  `pnpm preview:worker` for those.

Finish gate: `pnpm check` (read-only Biome check, workspace check, typecheck, tests and
`next build`). CI (`ci.yml`) runs it on every PR, plus migration validation, the Worker build, the
E2E smoke suite and the link check; CI on the final commit is the record, so don't repeat it
locally. Run it only to reproduce a CI failure, in the background.

## Workflow

The SERP [git workflow](https://github.com/serpcompany/serp/blob/main/docs/engineering/standards/git-workflow.md)
applies, its review loop included, with these specifics:

- GitHub issues are the plan. The next task is the first open, unblocked sub-issue of the epic.
- Base branch: `staging` (`main` is production). The owner promotes it with a fast-forward:
  `git fetch origin && git push origin origin/staging:main`. Deploys run only in the deploy
  workflows, on pushes to `staging` and `main`; agents never deploy by hand, dispatch a deploy
  workflow, or approve the `production` environment.
- One issue, one `issue-<number>-<slug>` branch, one PR, squash merged. Work in a git worktree per
  issue, and never in a checkout that holds someone else's uncommitted changes.
- PR title: a Conventional Commit for the outcome a user notices. The body starts with
  `Closes #<number>`, says what is deliberately not included, and reports evidence levels apart.

## Evidence a PR needs

- Every change: the finish-gate result.
- Routes, redirects, metadata, robots, sitemaps, `next.config.ts` or data loaders: the sitemap
  URL count of a local preview with a full import before and after (`sitemap-urls`), the diff of
  that list, and before/after output for sample URLs.
- Visible UI: one screenshot of each changed page, from a local build or staging.
- Deploy workflows: a link to the deploy run.

## Invariants

- Public URLs are an SEO contract: never change or drop one without a permanent redirect, which
  the Worker serves. [urls.md](docs/agents/urls.md) has the trailing-slash and host rules.
- Never commit secrets. `.env.local` files are local only.

## Exceptions

Deliberate divergences from the SERP standards. They are not gaps; don't fix them.

- **shadcn `new-york` on Radix**, not `base-nova`: the owner chose "Keep look, fix bugs" (#58).
- **Shared packages, Turbo, `apps/e2e` and no `src/`**: the owner chose "Exceptions + Vitest".
- **No Sentry**: the owner said "no sentry"; errors are read in Workers Logs (`observability` in
  each deployed environment of `wrangler.jsonc`).
- **`/brands/` is rendered by this app** from repo data; the owner said
  "brands comes into th eproject. no shared worker". The shared brands Worker keeps serving
  production `/brands/` until a serpcompany/serp PR removes its route, which merges only after the
  in-app page (#60) is live in production (#66 H5).
- **Shop affiliate links stay as they are** (no disclosure, no `rel` change on the `serp.ly`
  links): the owner chose "Keep as-is".
- **`/_next/static/` skips the canonical-host redirect**: `www` and `*.workers.dev` answer hashed
  build output with 200, to save an invocation per chunk ([urls.md](docs/agents/urls.md)).
