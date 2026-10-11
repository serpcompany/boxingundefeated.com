# Environments

What `local`, `staging` and `production` each serve, and why a Worker build must match the
environment that serves it. Read this before changing anything that depends on the environment:
origins, canonicals, robots, Google Tag Manager or a Worker build. The SERP
[environment configuration](https://github.com/serpcompany/serp/blob/main/docs/engineering/standards/environment-configuration.md)
standard applies.

`SITE_ENVIRONMENT` is `local`, `staging` or `production`, and only `production` is indexable and
loads Google Tag Manager. `apps/web/lib/site-config.ts` resolves it, reading `process.env` when a
value is used, never at module load. A missing or unknown value is `local`. Never read
`SITE_ENVIRONMENT` or build an origin anywhere else.

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
