/**
 * The site's environment and the values that depend on it: the origin used for canonicals,
 * JSON-LD and sitemaps, whether pages may be indexed, robots.txt, and Google Tag Manager.
 *
 * serp `docs/engineering/standards/environment-configuration.md`: configuration is explicit per
 * environment, a site is non-production unless it is explicitly production, and configuration is
 * read when it is used. Nothing here reads `process.env` at module load; call `getSiteConfig()`
 * where the value is needed.
 *
 * Resolution order (`resolveSiteEnvironment`):
 *
 * 1. An explicit `SITE_ENVIRONMENT` wins. At Worker runtime it comes from the `vars` of
 *    `wrangler.jsonc`; for statically rendered output it is set in the build's environment
 *    (`build:worker:staging`, `build:worker:production`). A value that is not exactly `local`,
 *    `staging` or `production` is non-production (`local`).
 * 2. Without it, the static export (`next build` with `output: 'export'`, which GitHub Pages
 *    deploys) is production, unless it is built for a pull request (`GITHUB_EVENT_NAME` is
 *    `pull_request`, as in the Surge previews). This keeps the live deploy, whose workflow sets no
 *    `SITE_ENVIRONMENT`, indexable. next.config.ts inlines `SITE_BUILD_OUTPUT` into the bundles,
 *    so code running in the Worker knows it is not the export.
 * 3. Anything else is `local`: `next dev`, tests, the Worker build without a value, and the
 *    Worker runtime when `SITE_ENVIRONMENT` is missing.
 */

export const SITE_ENVIRONMENTS = ['local', 'staging', 'production'] as const
export type SiteEnvironment = (typeof SITE_ENVIRONMENTS)[number]

export const PRODUCTION_ORIGIN = 'https://boxingundefeated.com'
export const STAGING_ORIGIN = 'https://staging.boxingundefeated.com'
/** The port `serve:worker` listens on. `next dev` sets `PORT` to its own port. */
export const DEFAULT_LOCAL_PORT = '8787'

/** The site's Google Tag Manager container. It is public: the tag ships it to every browser. */
export const GTM_ID = 'GTM-PP4HWLM'

export const NON_PRODUCTION_ROBOTS_TAG = 'noindex'

/** The raw inputs, so tests and scripts can resolve a configuration without `process.env`. */
export interface SiteConfigInput {
  /** `SITE_ENVIRONMENT`: `local`, `staging` or `production`. */
  siteEnvironment?: string
  /** `SITE_BUILD_OUTPUT`, inlined by next.config.ts: `export` or `worker`. */
  buildOutput?: string
  /** `NODE_ENV`: `production` during `next build` and in the Worker. */
  nodeEnv?: string
  /** `GITHUB_EVENT_NAME`, set by GitHub Actions. */
  githubEventName?: string
  /** `PORT`, for the local origin. */
  port?: string
}

export interface SiteConfig {
  environment: SiteEnvironment
  isProduction: boolean
  /** The origin without a trailing slash, for example `https://boxingundefeated.com`. */
  origin: string
  /** The Google Tag Manager container to render, or null outside production. */
  gtmId: string | null
}

/**
 * Reads the inputs from `process.env`. Each variable is read by its literal name so the values
 * that next.config.ts inlines at build time (`SITE_BUILD_OUTPUT`, `NODE_ENV`) are replaced.
 */
export function readSiteConfigInput(): SiteConfigInput {
  return {
    siteEnvironment: process.env.SITE_ENVIRONMENT,
    buildOutput: process.env.SITE_BUILD_OUTPUT,
    nodeEnv: process.env.NODE_ENV,
    githubEventName: process.env.GITHUB_EVENT_NAME,
    port: process.env.PORT
  }
}

/** The environment named by `value`, or null unless it is exactly one of the known names. */
export function parseSiteEnvironment(value: unknown): SiteEnvironment | null {
  return SITE_ENVIRONMENTS.find(environment => environment === value) ?? null
}

function isPullRequestBuild(githubEventName: string | undefined): boolean {
  return githubEventName === 'pull_request' || githubEventName === 'pull_request_target'
}

/** See the resolution order at the top of this file. */
export function resolveSiteEnvironment(input: SiteConfigInput): SiteEnvironment {
  if (input.siteEnvironment) {
    return parseSiteEnvironment(input.siteEnvironment) ?? 'local'
  }

  const isExportBuild = input.buildOutput === 'export' && input.nodeEnv === 'production'
  if (isExportBuild && !isPullRequestBuild(input.githubEventName)) {
    return 'production'
  }

  return 'local'
}

export function siteOriginFor(environment: SiteEnvironment, port?: string): string {
  switch (environment) {
    case 'production':
      return PRODUCTION_ORIGIN
    case 'staging':
      return STAGING_ORIGIN
    case 'local':
      return `http://localhost:${port || DEFAULT_LOCAL_PORT}`
  }
}

export function getSiteConfig(input: SiteConfigInput = readSiteConfigInput()): SiteConfig {
  const environment = resolveSiteEnvironment(input)
  const isProduction = environment === 'production'

  return {
    environment,
    isProduction,
    origin: siteOriginFor(environment, input.port),
    gtmId: isProduction ? GTM_ID : null
  }
}

/** The current environment's origin, for canonicals, JSON-LD and sitemaps. */
export function getSiteOrigin(): string {
  return getSiteConfig().origin
}
