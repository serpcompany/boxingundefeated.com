# e2e

Smoke tests and URL checks for every environment of boxingundefeated.com:

- **Smoke suite** (Playwright, `tests/`): the assertions in the verification sections of the SERP
  [URL trailing slash](https://github.com/serpcompany/serp/blob/main/docs/engineering/standards/url-trailing-slash.md#verification)
  and
  [environment configuration](https://github.com/serpcompany/serp/blob/main/docs/engineering/standards/environment-configuration.md#verification)
  standards.
- **URL parity** (`src/parity.ts`): every URL a reference's sitemaps list, on a candidate.
- **Sitemap URLs** (`src/sitemap-urls.ts`): every page URL an origin's sitemaps list, for the link
  check (`lychee.toml` at the repository root).

Run everything from the repository root.

## Interface for CI

| Command | Input | Passes when |
| --- | --- | --- |
| `BASE_URL=<origin> EXPECT_ENV=<env> pnpm test:e2e` | `BASE_URL`: the origin under test. `EXPECT_ENV`: `local`, `staging` or `production`, required with `BASE_URL` | Every smoke test passes |
| `EXPECT_ENV=<env> pnpm parity -- <origin>` | The candidate origin. `EXPECT_ENV` defaults to `production` | 0 mismatches outside `src/parity-allowlist.ts`, 0 errors |
| `pnpm --silent --filter e2e sitemap-urls <origin> > urls.txt`, then `lychee --config lychee.toml --files-from urls.txt` | The origin under test, a local preview | Every link and asset on every page answers 200 without a redirect |

- Requests to a `*.workers.dev` host carry `x-boxingundefeated-smoke-test: 1`, which exempts them
  from the canonical-host redirect. The host test sends the same host without it and expects 308.
- Optional for `test:e2e`: `CANONICAL_ORIGIN` (default: the environment's origin;
  `http://localhost:8787` for `local`) and `NON_CANONICAL_HOSTS` (comma-separated; default: the
  environment's `*.workers.dev` host, plus `www` for production on the apex or locally).
- **CI tests each Worker on its workers.dev host** (#45): the zone's Bot Fight Mode challenges
  GitHub's runners on `boxingundefeated.com` and its subdomains, so the deploy jobs never reach
  the apex or `www`. To check the `www` → apex redirect, run the production smoke from your own
  machine with `BASE_URL=https://boxingundefeated.com`.
- `/api/search` must answer 200 with JSON, so a Worker deployed before #36 fails the smoke.
- The sitemap test (`tests/sitemaps.spec.ts`) requests every URL the sitemaps list on a local
  preview (about 6,450 with a full import, a minute or two), but only the first and last few of
  each child sitemap on a deployed environment, to keep the load on the live site small.
- Playwright doesn't retry (`retries: 0`), so a flaky test fails the run. Only the host check
  retries, for up to 30 s, while a new deploy reaches every edge.
- Parity writes `parity-report/parity-<host>.md` and `.json` here. Its options: `--reference
  <origin>` (default `https://boxingundefeated.com`, the production Worker: compare a candidate
  that isn't production, such as staging or a local preview, against it), `--concurrency <n>`
  (default and maximum 8 for remote hosts), `--report-dir <dir>`. It retries a 429, a 5xx or a
  network error with backoff (2, 4, 8 s, or `Retry-After`). A URL the reference still doesn't
  answer with 200 is an error, and the run fails.
- The link check is offline in effect: `lychee.toml` checks only `http://localhost:<port>/` URLs,
  so it never requests a third-party site or the production origin that canonicals name.
- `test:e2e` writes `playwright-report/` and `test-results/` here. Keep both as CI artifacts.
- CI installs the browser once: `pnpm --filter e2e test:install`.

Examples:

```bash
BASE_URL=https://staging.boxingundefeated.com EXPECT_ENV=staging pnpm test:e2e
BASE_URL=https://boxingundefeated-com-production.serpcompany.workers.dev EXPECT_ENV=production pnpm test:e2e
EXPECT_ENV=staging pnpm parity -- https://staging.boxingundefeated.com
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
local production D1, and `--env staging` or `--env production` rewrites every `Host` header to
that environment's first route:

```bash
pnpm --filter web build:worker:production
CHOKIDAR_USEPOLLING=1 pnpm --filter web exec opennextjs-cloudflare preview --port 8805 \
  --var SITE_ENVIRONMENT:production --var CANONICAL_HOST_REDIRECT:on
BASE_URL=http://localhost:8805 EXPECT_ENV=production pnpm test:e2e
```

A local preview reaches the non-canonical hosts with a `Host` header. Parity against production
needs the full import (`pnpm db:import -- --target local --source <boxers.json>`):

```bash
pnpm parity -- http://localhost:8805
```
