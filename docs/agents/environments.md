# Environments

What `local`, `staging` and `production` each serve, and why a Worker build must match the
environment that serves it. Read this before changing anything that depends on the environment:
origins, canonicals, robots, Google Tag Manager or a Worker build. The SERP
[environment configuration](https://github.com/serpcompany/serp/blob/main/docs/engineering/standards/environment-configuration.md)
standard applies.

`SITE_ENVIRONMENT` is `local`, `staging` or `production`, and only `production` is indexable and
loads Google Tag Manager (staging looks the same to a request with its password, below).
`apps/web/lib/site-config.ts` resolves it, reading `process.env` when a value is used, never at
module load. A missing or unknown value is `local`. Never read `SITE_ENVIRONMENT` or build an
origin anywhere else.

| | local | staging | production |
| --- | --- | --- | --- |
| Origin (canonicals, JSON-LD, sitemaps) | `http://localhost:<PORT or 8787>` | `https://staging.boxingundefeated.com` | `https://boxingundefeated.com` |
| `<meta name="robots">` | `noindex` | none | none |
| `X-Robots-Tag` | `noindex` | `noindex`, except on a request that passed the password | none |
| `/robots.txt` | `Disallow: /` | `Disallow: /`; `AhrefsSiteAudit` gets `Allow: /`; staging's sitemap index | `Allow: /` and the sitemap index |
| Password (HTTP Basic) | no | `stagingpassword`, any username | no |
| Google Tag Manager | no | no | `GTM-PP4HWLM` (in code) |
| `CANONICAL_HOST_REDIRECT` (`www`, `*.workers.dev` -> origin) | `off` | `on` | `on` |

Prerendered HTML is fixed at build, so a Worker build and the environment that serves it must use
the same value (`build:worker:staging` with `--env staging`); on a mismatch the Worker answers 503
to everything and deploys refuse it (`lib/worker/build-environment.ts`). At runtime, unless the
`wrangler.jsonc` var is exactly `production`, the Worker sends `X-Robots-Tag: noindex`
(`lib/worker/environment-policy.ts`), except on staging to a request that passed the password. A
local or unknown runtime also answers `/robots.txt` with `Disallow: /` itself; staging and
production serve the one their build prerendered. `app/robots.ts` (rules in `lib/robots.ts`) is
the only robots source. Staging's HTML has no robots meta tag, as production's: the edge cache
serves the same page to requests with and without the password, so its noindex is the header
alone. Only a local build bakes the meta tag in.

## Staging's password

Staging (`staging.boxingundefeated.com` and its `*.workers.dev` host) answers 401 with
`WWW-Authenticate: Basic` to a request without the shared password, so it can look exactly like
production (indexable, with its own canonicals and sitemaps) to an SEO auditor who has it. The SERP
[staging access](https://github.com/serpcompany/serp/blob/main/docs/engineering/standards/staging-access.md)
standard applies.

- The password is the plain var `STAGING_BASIC_AUTH_PASSWORD` in `env.staging.vars` of
  `wrangler.jsonc`: `stagingpassword`, public on purpose and shared by every SERP staging, so not a
  secret. The username is ignored. Production and the local top level never have the var.
- The gate (`lib/worker/staging-access.ts`) runs only when `SITE_ENVIRONMENT` is exactly `staging`,
  on every host. It fails closed: with the var missing or empty it refuses everything but the
  exemptions. A deployed staging build whose runtime var is anything else fails the build guard
  above (503 to everything), so it never serves pages without the gate. Local and production are
  never gated.
- Exempt: requests with the `x-boxingundefeated-smoke-test` header (CI) and `GET`/`HEAD`
  `/robots.txt`. The site has no webhooks, so none is exempt. Exempt requests keep `noindex`, even
  when they also send the password.
- Local runs: `pnpm --filter web serve:worker --env staging` takes the password from
  `env.staging`. On the local top level (real `Host` headers), set it with
  `--var STAGING_BASIC_AUTH_PASSWORD:...` or a line `STAGING_BASIC_AUTH_PASSWORD=...` in the
  gitignored `apps/web/.dev.vars`. The E2E suite sends `stagingpassword` unless
  `STAGING_BASIC_AUTH_PASSWORD` is set; its README has the recipe.
