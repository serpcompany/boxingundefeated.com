# e2e

Smoke tests and URL checks for every environment of boxingundefeated.com:

- **Smoke suite** (Playwright, `tests/`): the assertions in the verification sections of the SERP
  [URL trailing slash](https://github.com/serpcompany/serp/blob/main/docs/engineering/standards/url-trailing-slash.md#verification)
  and
  [environment configuration](https://github.com/serpcompany/serp/blob/main/docs/engineering/standards/environment-configuration.md#verification)
  standards.
- **URL parity** (`src/parity.ts`): every URL the live site serves, on a candidate.
- **Export check** (`src/check-export.ts`): the static export GitHub Pages deploys is the production
  site. Run it until the cutover to the Worker (#19).

Run everything from the repository root.

## Interface for CI

| Command | Input | Passes when |
| --- | --- | --- |
| `BASE_URL=<origin> EXPECT_ENV=<env> pnpm test:e2e` | `BASE_URL`: the origin under test. `EXPECT_ENV`: `local`, `staging` or `production`, required with `BASE_URL` | Every smoke test passes |
| `EXPECT_ENV=<env> pnpm parity -- <origin>` | The candidate origin. `EXPECT_ENV` defaults to `production` | 0 mismatches outside `src/parity-allowlist.ts`, 0 errors |
| `pnpm check:export` | `apps/web/out`, built with the Pages workflow's env (below) | Robots, noindex, GTM and canonicals are production |

- Requests to a `*.workers.dev` host carry `x-boxingundefeated-smoke-test: 1`, which exempts them
  from the canonical-host redirect. The host test sends the same host without it and expects 308.
- Optional for `test:e2e`: `CANONICAL_ORIGIN` (default: the environment's origin;
  `http://localhost:8787` for `local`) and `NON_CANONICAL_HOSTS` (comma-separated; default: the
  environment's `*.workers.dev` host, plus `www` for production on the apex or locally).
- **After the cutover (#19)**, run the production smoke with `BASE_URL=https://boxingundefeated.com`
  (or add `www.boxingundefeated.com` to `NON_CANONICAL_HOSTS`): with the workers.dev URL as
  `BASE_URL`, `www` is not tested. Before the cutover `www` is GitHub Pages, which answers 301.
- `/api/search` must answer 200 with JSON, so a Worker deployed before #36 fails the smoke.
- Playwright doesn't retry (`retries: 0`), so a flaky test fails the run. Only the host check
  retries, for up to 30 s, while a new deploy reaches every edge.
- Parity writes `parity-report/parity-<host>.md` and `.json` here. Its options: `--reference
  <origin>` (default `https://boxingundefeated.com`), `--out-dir <dir>` (default `apps/web/out`;
  without one it checks the sitemap URLs only), `--concurrency <n>` (default and maximum 8 for
  remote hosts), `--report-dir <dir>`. It retries a 429, a 5xx or a network error with backoff
  (2, 4, 8 s, or `Retry-After`). A URL the reference still doesn't answer with 200 is an error, and
  the run fails; only a 404 or 410 for an export page that the sitemaps don't list is skipped.
- `test:e2e` writes `playwright-report/` and `test-results/` here. Keep both as CI artifacts.
- CI installs the browser once: `pnpm --filter e2e test:install`.

Examples:

```bash
BASE_URL=https://staging.boxingundefeated.com EXPECT_ENV=staging pnpm test:e2e
BASE_URL=https://boxingundefeated-com-production.serpcompany.workers.dev EXPECT_ENV=production pnpm test:e2e
pnpm parity -- https://boxingundefeated-com-production.serpcompany.workers.dev
EXPECT_ENV=staging pnpm parity -- https://staging.boxingundefeated.com
env -u SITE_ENVIRONMENT GITHUB_EVENT_NAME=push pnpm --filter web build:vercel && pnpm check:export
```

## The local preview

Without `BASE_URL`, `pnpm test:e2e` tests the local Worker preview on http://localhost:8787 with the
`local` config, and starts it with `pnpm --filter web serve:worker` unless one is running. The
sample pages (`tests/site.ts`) are in the committed D1 fixture, so the seed is enough:

```bash
pnpm db:reset:local      # migrate and seed the fixture
pnpm build:worker        # the local config; the HTML must match the vars that serve it
pnpm test:e2e
```

To test production behavior locally, including the host redirects, serve a production build with the
production vars on the local top level of `wrangler.jsonc`. `--env production` would read an empty
local production D1, and `--env staging` rewrites every `Host` header:

```bash
pnpm --filter web build:worker:production
CHOKIDAR_USEPOLLING=1 pnpm --filter web exec opennextjs-cloudflare preview --port 8805 \
  --var SITE_ENVIRONMENT:production --var CANONICAL_HOST_REDIRECT:on
BASE_URL=http://localhost:8805 EXPECT_ENV=production pnpm test:e2e
```

A local preview reaches the non-canonical hosts with a `Host` header. Parity needs the full import
(`pnpm db:import -- --target local --source <boxers.json>`) and the static export in
`apps/web/out` (`pnpm export`):

```bash
pnpm parity -- http://localhost:8805
```

## Pending

- "Sitemaps list only canonical URLs" is `test.fixme`, owned by #15, which publishes the sitemaps
  per environment.
