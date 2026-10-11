# AGENTS

boxingundefeated.com is a boxing database: about 5,600 boxer profiles with fight histories, weight
division listings and boxer search. It runs as a Next.js OpenNext Worker with D1 and Drizzle on
Cloudflare (cut over from GitHub Pages on 2026-10-06, #19); the remaining plan lives in the pinned
epic, serpcompany/boxingundefeated.com#3.

The SERP-wide [standards](https://github.com/serpcompany/serp/tree/main/docs/engineering/standards)
apply here unless [Exceptions](#exceptions) declares otherwise. Use this file as a map: read only
what the task needs, then verify against the code.

Stage: explore
Agents may merge: yes

Only the owner changes these two lines. Agents merge once CI is green and a fresh review (one round,
plus a re-review of the fix commits after blocking findings) has no open blocking findings, one PR at
a time, checking the staging deploy after each. The owner always merges PRs that change these lines,
the finish-gate command, CI or deploy workflows or the scripts they run, shared-database migrations,
and release PRs (`staging` to `main`), and runs DNS changes. Rules:
[Verification Cadence](https://github.com/serpcompany/serp/blob/main/docs/engineering/standards/verification-cadence.md#merging-and-deploys).

Planned: Ship (agents merge listed paths, to be chosen by the owner) once round 2 of #3 is done
(owner, 2026-10-11).

## Where things live

- `apps/web/`: the Next.js app (App Router). Read the parts below before changing pages.
  - `app/`: boxers, divisions, search, legal (TSX in `app/(legal)/`) and HTML sitemap pages.
  - `lib/`: data loaders, URL, metadata, route and XML sitemap (`sitemaps/`) helpers. Pages read
    boxers only through `lib/boxer-data/`, which reads D1 on request via the server-only,
    fail-closed `lib/data/`; search calls `/api/search`. `lib/site-config.ts` alone resolves the
    environment and origin; [environments.md](docs/agents/environments.md) has what each serves.
  - `public/`: files served at the same path ([urls.md](docs/agents/urls.md)).
  - `scripts/`: the `build:worker` step that records the build's environment and commit
    (`write-build-environment.ts`).
  - `wrangler.jsonc`, `open-next.config.ts`, `worker.ts`, `lib/worker/`: the Worker. Its pipeline,
    build, preview, E2E, parity and link commands, and deploys: [worker.md](docs/agents/worker.md).
- `d1/`: `drizzle/` migrations, `fixtures/`, `reports/`. [d1.md](docs/agents/d1.md): the boxer data
  (pinned in R2), migrations, imports (staging and production only from CI) and the deploy gate.
- `packages/data-ops/`: the D1 data layer: the Drizzle schema (`src/schema.ts`), types, every
  query the app runs (`src/queries.ts`; the app never writes SQL) and the pipeline importer's
  mapping (`src/import/`). Vitest runs them on an in-memory D1 (Miniflare), migrations applied.
- `packages/design-system/`: shared UI (shadcn). Read before adding a component or helper.
- `configs/`: shared Next.js and TypeScript configuration. Read before changing build settings.
- `apps/e2e/`: the Playwright smoke suite, the sitemap URL lister and the parity check.
- `scripts/`: `d1/`, the D1 import, parity and deploy checks.
- `.github/workflows/`: `ci.yml` (the check, then the deploys; `All checks` is the required check),
  `d1-import.yml` (data imports, [d1.md](docs/agents/d1.md)) and `pr-issue-link.yml`.
  `.github/scripts/`: the production release gate, the deploy wait and the D1 import preflight.

## Commands

Inner loop, while editing (seconds):

- `pnpm --filter web typecheck`
- `pnpm --filter web exec vitest run <paths>`: the tests for the code you changed.
- `pnpm --filter @boxingundefeated/data-ops test`: the query and importer tests.
- `pnpm exec biome lint <paths>`
- `pnpm --filter web exec next dev --port 3003`: the dev server, on the local D1. `/api/search`
  and the XML sitemaps are answered only by the Worker, so search fails here; use
  `pnpm preview:worker` for those.

Finish gate: `pnpm check` (read-only Biome check, workspace check, typecheck, `db:check`, tests,
`next build`). CI (`ci.yml`) runs it on every PR, plus migration validation, a Worker build per
environment, E2E on the local and staging configs and the link check; CI on the final commit is the
record, so don't repeat it locally. Run it only to reproduce a CI failure, in the background.

## Workflow

The SERP [git workflow](https://github.com/serpcompany/serp/blob/main/docs/engineering/standards/git-workflow.md)
applies, its review loop included, with these specifics:

- GitHub issues are the plan. The next task is the first open, unblocked sub-issue of the epic.
- Base branch: `staging` (`main` is production). The owner promotes it with a fast-forward:
  `git fetch origin && git push origin origin/staging:main`. Deploys run only in `ci.yml`, on
  pushes to `staging` and `main`, once its checks pass on that commit; agents never deploy by hand,
  dispatch `ci.yml` or `d1-import.yml`, re-run a deploy or import job, or approve `production`.
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
- CI or deploy jobs: a link to the run.

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
- **No `/brands/` page** (the brands-page standard asks for one and a footer link); the owner said
  "actually lets just remove the brands page." `/brands/` answers 410 (#59); serpcompany/serp#1490
  removes the shared Worker's route once the 410 is live in production (#66 H5).
- **No shop**: retired with 410 (owner, 2026-10-11; #94). Every `/shop` URL and
  `/sitemap-shop.xml` answer 410, and its Amazon affiliate links are gone with it.
- **`/_next/static/` skips the canonical-host redirect**: `www` and `*.workers.dev` answer hashed
  build output with 200, to save an invocation per chunk ([urls.md](docs/agents/urls.md)).
- **Cloudflare Web Analytics is injected by Cloudflare, not by code** ("Enable, excluding visitor
  data in the EU"; a code beacon would double-count): the owner chose "Keep Cloudflare's setting,
  drop #72's beacon" (#61). Staging is password-gated, so injection there reaches only the team.
