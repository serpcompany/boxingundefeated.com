# AGENTS

boxingundefeated.com is a boxing database: about 5,600 boxer profiles with fight histories, weight
division listings, and an Amazon-affiliate shop. Today it is a Next.js static export deployed to
GitHub Pages. It is migrating to a Next.js OpenNext Worker with D1 and Drizzle on Cloudflare; the
plan and its order live in the pinned epic, serpcompany/boxingundefeated.com#3.

The SERP-wide standards in
[serpcompany/serp `docs/engineering/standards/`](https://github.com/serpcompany/serp/tree/main/docs/engineering/standards)
apply here unless this file declares an exception. Use this file as a map: read only what the task
needs, then verify against the code.

Stage: not declared (treated as Ship). Only the owner sets the stage and any agent-merge line.

## Where things live

- `apps/web/`: the Next.js app (App Router). Read its `app/` routes, `lib/` helpers and `content/`
  before changing pages.
  - `app/`: boxers, divisions, shop, search, brands, legal and HTML sitemap pages. `[...slug]`
    renders shop articles at `/shop/best/<slug>/`.
  - `lib/`: build-time data loaders (boxers, shop, blog), URL, metadata, route and sitemap-path
    helpers. Change URLs here, not in individual pages.
  - `content/`: markdown shop articles and legal MDX.
  - `public/data/boxers/`: per-boxer JSON generated from the pipeline data. Never hand-edit it.
  - `scripts/`: data generators. The search index is built before `next build` (`predev`,
    `build:with-data`); XML sitemaps are written after it and rewrite files in `public/`, so
    revert those changes before committing.
- `packages/`: shared UI (`design-system`, shadcn), `hooks` and `utils`. Read before adding a
  component or helper that might already exist.
- `configs/`: shared Next.js and TypeScript configuration. Read before changing build settings.
- `scripts/`: data scripts. `split-boxer-data.js` turns the pipeline JSON into
  `apps/web/public/data/boxers/`.
- `from-pipeline/boxers.json`: the pipeline output (about 104 MB, gitignored). Only data
  regeneration needs it; builds read `public/data/`. To regenerate in a fresh checkout or
  worktree, copy it there and link it: `ln -s ../../../from-pipeline/boxers.json
  apps/web/data/boxers.json`.
- `.github/workflows/`: `deploy-github-pages.yml` deploys `main` to production, `pr-review.yml`
  runs PR checks, `preview.yml` publishes PR previews.

## Commands

Inner loop, while editing (seconds):

- `pnpm --filter web typecheck`
- `pnpm --filter web exec jest <paths>`: the tests for the code you changed.
- `pnpm exec biome lint <paths>`
- `pnpm --filter web exec next dev --port 3003`: the dev server. `pnpm dev` first runs `predev`,
  which regenerates `public/data/` and needs `apps/web/data/boxers.json`.

Finish gate, once per state when the branch is finished: `pnpm check` (read-only Biome check,
workspace check, typecheck, tests and the production build; about a minute for the build). Run it
in the background. Don't re-run it on an unchanged tree; cite the earlier run.

## Workflow

- GitHub issues are the plan. The next task is the first open, unblocked sub-issue of the epic.
- Base branch: `main`, until the staging deploy issue makes `staging` the base branch.
- One issue, one `issue-<number>-<slug>` branch, one PR, squash merged. Work in a git worktree per
  issue, and never in a checkout that holds someone else's uncommitted changes.
- PR title: a Conventional Commit describing the outcome a user notices. The body starts with
  `Closes #<number>`, says what is deliberately not included, and reports evidence levels
  separately.
- A fresh agent reviews every PR. Agents never merge unless the owner adds `Agents may merge: yes`
  to this file; until then, the owner accepts and merges.

## Evidence a PR needs

- Every change: the finish-gate result.
- Routes, redirects, metadata, robots, sitemaps, `next.config.ts` or data loaders: the HTML page
  count of `apps/web/out` before and after, the diff of the page list, and before/after output for
  sample URLs.
- Visible UI: one screenshot of each changed page, from the PR preview (`preview.yml`) or a local
  build.
- Deploy workflows: a link to the deploy run.

## Invariants

- Public URLs are an SEO contract. Never change or drop one without a permanent redirect. GitHub
  Pages can't serve redirects, so until the Worker cutover, don't change URLs at all.
- Pages end in a trailing slash, files never do, and the homepage canonical is the origin without
  a slash (SERP URL trailing-slash standard).
- Never commit secrets. `.env.local` files are local only.
