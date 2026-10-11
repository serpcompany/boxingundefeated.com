/**
 * What the smoke suite tests and what it expects, from the environment variables CI sets:
 *
 * - `BASE_URL`: the origin under test. Unset, it is the local Worker preview on
 *   http://localhost:8787, which Playwright starts with `serve:worker` unless one is running.
 * - `EXPECT_ENV`: `local`, `staging` or `production`, the configuration the target must show
 *   (lib/site-config.ts in apps/web). Required with `BASE_URL`; `local` without it.
 * - `CANONICAL_ORIGIN`: optional. The origin canonicals must use; defaults to the environment's.
 * - `NON_CANONICAL_HOSTS`: optional, comma-separated. The hosts that must answer 308 to the
 *   canonical origin. Defaults below; an empty value tests none.
 * - `STAGING_BASIC_AUTH_PASSWORD`: optional. Staging's password, for the tests that send it
 *   (tests/staging-access.spec.ts). Defaults to `stagingpassword`, which every SERP site's staging
 *   shares and which is public on purpose (serp docs/engineering/standards/staging-access.md).
 *
 * Requests to a `*.workers.dev` target carry the smoke-test header, which exempts them from the
 * canonical-host redirect (apps/web/lib/routing/canonical-host.ts). So does every request to a
 * staging target, where the header is also the exemption from staging's password
 * (apps/web/lib/worker/staging-access.ts): the suite tests staging as CI sees it, with noindex.
 */

export const SMOKE_TEST_HEADER = 'x-boxingundefeated-smoke-test'

export const EXPECTED_ENVIRONMENTS = ['local', 'staging', 'production'] as const
export type ExpectedEnvironment = (typeof EXPECTED_ENVIRONMENTS)[number]

export const PRODUCTION_ORIGIN = 'https://boxingundefeated.com'
export const STAGING_ORIGIN = 'https://staging.boxingundefeated.com'
/** A local build renders this origin whatever port serves it (lib/site-config.ts). */
export const LOCAL_ORIGIN = 'http://localhost:8787'
export const LOCAL_PREVIEW_URL = 'http://localhost:8787'

export const GTM_ID = 'GTM-PP4HWLM'

/** The password every SERP site's staging shares; public, so not a secret (staging-access.md). */
export const STAGING_PASSWORD = 'stagingpassword'

const WWW_HOST = 'www.boxingundefeated.com'
const PLATFORM_HOSTS: Record<'staging' | 'production', string> = {
  staging: 'boxingundefeated-com-staging.serpcompany.workers.dev',
  production: 'boxingundefeated-com-production.serpcompany.workers.dev'
}

export interface NonCanonicalHost {
  host: string
  /** The URL to request: the host itself, or the local preview with a `Host` header. */
  url: string
  headers: Record<string, string>
}

export interface Target {
  baseUrl: string
  environment: ExpectedEnvironment
  /** The origin canonicals, `og:url`, robots.txt and sitemaps use, without a trailing slash. */
  canonicalOrigin: string
  /** Headers every request to `baseUrl` sends: the smoke-test header (`smokeHeadersFor`). */
  headers: Record<string, string>
  /** True when `baseUrl` is this machine, so other hosts are reached with a `Host` header. */
  isLocal: boolean
  nonCanonicalHosts: NonCanonicalHost[]
  /** Staging's password: `STAGING_BASIC_AUTH_PASSWORD`, or `STAGING_PASSWORD` when unset. */
  stagingPassword: string
}

/** `process.env`, or the same variables in a test. */
export type TargetInput = Partial<Record<string, string>>

const ENVIRONMENT_ORIGINS: Record<ExpectedEnvironment, string> = {
  local: LOCAL_ORIGIN,
  staging: STAGING_ORIGIN,
  production: PRODUCTION_ORIGIN
}

export function isPlatformHost(hostname: string): boolean {
  return hostname.toLowerCase().endsWith('.workers.dev')
}

/**
 * The smoke-test header for a request to `url`: on a `*.workers.dev` host, and on any host when
 * the target is staging, which serves nothing else without its password.
 */
export function smokeHeadersFor(
  url: string,
  environment?: ExpectedEnvironment
): Record<string, string> {
  const smoke = environment === 'staging' || isPlatformHost(new URL(url).hostname)
  return smoke ? { [SMOKE_TEST_HEADER]: '1' } : {}
}

/** An `Authorization: Basic` header for staging's password; the gate ignores the username. */
export function basicAuthorization(password: string, username = 'staging'): string {
  return `Basic ${Buffer.from(`${username}:${password}`, 'utf8').toString('base64')}`
}

export function isLocalHost(hostname: string): boolean {
  return ['localhost', '127.0.0.1', '[::1]'].includes(hostname)
}

export function parseExpectedEnvironment(value: string | undefined): ExpectedEnvironment {
  const environment = EXPECTED_ENVIRONMENTS.find(name => name === value)
  if (!environment) {
    throw new Error(`EXPECT_ENV must be one of ${EXPECTED_ENVIRONMENTS.join(', ')}, not ${value}`)
  }
  return environment
}

export function environmentOrigin(environment: ExpectedEnvironment): string {
  return ENVIRONMENT_ORIGINS[environment]
}

/**
 * The hosts that redirect to the canonical origin when the environment's
 * `CANONICAL_HOST_REDIRECT` is on: its `*.workers.dev` host, and `www` for production once it
 * serves the apex (or locally, where any host can be sent). Locally only with deployed config:
 * the `local` config has the redirect off.
 */
function defaultNonCanonicalHosts(
  environment: ExpectedEnvironment,
  baseHost: string,
  isLocal: boolean
): string[] {
  if (environment === 'local') return []
  const hosts = [PLATFORM_HOSTS[environment]]
  if (environment === 'production' && (isLocal || baseHost === new URL(PRODUCTION_ORIGIN).host)) {
    hosts.push(WWW_HOST)
  }
  return hosts
}

export function resolveTarget(input: TargetInput): Target {
  if (input.BASE_URL && !input.EXPECT_ENV) {
    throw new Error('Set EXPECT_ENV (local, staging or production) together with BASE_URL.')
  }
  const baseUrl = new URL(input.BASE_URL || LOCAL_PREVIEW_URL).origin
  const environment = parseExpectedEnvironment(input.EXPECT_ENV || 'local')
  const { hostname, host } = new URL(baseUrl)
  const isLocal = isLocalHost(hostname)
  const canonicalOrigin = new URL(input.CANONICAL_ORIGIN || environmentOrigin(environment)).origin

  const hostNames =
    input.NON_CANONICAL_HOSTS === undefined
      ? defaultNonCanonicalHosts(environment, host, isLocal)
      : input.NON_CANONICAL_HOSTS.split(',')
          .map(name => name.trim())
          .filter(Boolean)

  return {
    baseUrl,
    environment,
    canonicalOrigin,
    headers: smokeHeadersFor(baseUrl, environment),
    isLocal,
    nonCanonicalHosts: hostNames.map(
      (name): NonCanonicalHost =>
        isLocal
          ? { host: name, url: baseUrl, headers: { host: name } }
          : { host: name, url: `https://${name}`, headers: {} }
    ),
    stagingPassword: input.STAGING_BASIC_AUTH_PASSWORD || STAGING_PASSWORD
  }
}
