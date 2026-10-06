# Boxing Undefeated

A boxing database at [boxingundefeated.com](https://boxingundefeated.com): about 5,600 professional
boxer profiles with fight histories, weight division listings, boxer search and an
Amazon-affiliate shop.

Agents and contributors: start with [AGENTS.md](AGENTS.md) for the repository map, commands,
environments and workflow.

## Stack

- **Runtime**: Next.js 16 and React 19 as one OpenNext Worker on Cloudflare, with a local, a
  staging and a production environment (`apps/web/wrangler.jsonc`).
- **Data**: boxers, bouts and divisions live in Cloudflare D1, one database per environment, with
  a Drizzle schema and reviewed migrations (`packages/data-ops`, `d1/drizzle`). Boxer pages,
  listings, divisions, the homepage, search and the XML sitemaps read D1 on request, behind an
  edge cache. Shop articles and legal pages are markdown and TSX, prerendered at build.
- **Styling**: Tailwind CSS 4 and a shared shadcn design system (`packages/design-system`).
- **Monorepo**: pnpm workspaces and Turbo.

## Layout

```
apps/web/            The Next.js app and the Worker (worker.ts, lib/worker/)
apps/e2e/            Playwright smoke tests, URL parity and the sitemap URL list for link checks
packages/data-ops/   D1 schema, queries, the pipeline importer's mapping and the parity rules
packages/design-system/
configs/             Shared Next.js and TypeScript configuration
d1/                  Migrations, the committed fixture and parity reports
scripts/d1/          db:import, db:parity, db:check-deployable
```

## Data

The pipeline's output (`from-pipeline/boxers.json`, about 104 MB, gitignored) is the only source
of boxer data. `pnpm db:import` loads it into an environment's D1, idempotently, and
`pnpm db:parity` proves the import lost nothing by comparing every row with that file. Local
development and CI use a small committed fixture (`d1/fixtures/boxers.sample.json`).

```bash
pnpm install
pnpm db:reset:local                    # migrate the local D1 and seed the fixture
pnpm --filter web exec next dev --port 3003
pnpm preview:worker                    # the Worker build, served on http://localhost:8787
pnpm check                             # the finish gate
```

## Deploys

`staging` is the base branch: CI deploys the staging Worker on every merge into it. The owner
promotes `staging` to `main`, which deploys production. Data imports into staging and production
run separately from deploys (AGENTS.md, "D1").
