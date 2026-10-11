/**
 * Staging's password (#57; serp `docs/engineering/standards/staging-access.md`). Staging sits
 * behind HTTP Basic auth, so it can describe itself exactly as production will (indexable, with
 * canonicals and sitemaps on its own host) while search engines and the public stay out. SEO
 * auditors get the password and crawl staging as search engines will crawl the apex. Modeled on
 * best.serp.co's `lib/environment/staging-access.ts`.
 *
 * - **Where:** the Worker pipeline (lib/worker/handle-request.ts), after the build guard and
 *   before everything else: the canonical-host redirect, the crawl policy, `/api/search`, the XML
 *   sitemaps, the D1 readiness gate and the edge cache. It runs on every host the staging Worker
 *   answers, `*.workers.dev` included, so a request there without the password gets the 401, not
 *   the redirect: the zone's Bot Fight Mode keeps CI off staging.boxingundefeated.com (#45), so the
 *   deploy smoke can only prove the gate on the workers.dev host. Only a Worker whose
 *   `SITE_ENVIRONMENT` is exactly `staging` has it; production and local never do.
 * - **The password** is `STAGING_BASIC_AUTH_PASSWORD`, a plain var in `env.staging.vars` of
 *   wrangler.jsonc, never a secret: every SERP site's staging shares `stagingpassword`, and the
 *   standard states it. The username is ignored, so a tool that asks only for a password works.
 * - **Fail closed:** without the var (missing or empty), every request is refused except the
 *   exemptions.
 * - **Comparison:** SHA-256 of both values, compared in constant time
 *   (`crypto.subtle.timingSafeEqual` in workerd).
 * - **The 401** carries `WWW-Authenticate: Basic`, `Cache-Control: no-store` and the
 *   non-production `X-Robots-Tag`. It is answered before the edge cache, so it is never stored.
 * - **A request that passes** goes on without its `Authorization` header, so the edge cache
 *   stores and serves it like an anonymous one, and the crawl policy sends it no noindex
 *   (lib/worker/environment-policy.ts).
 * - **Exemptions** (served without the password, and kept noindex): requests with the smoke-test
 *   header (CI), and `GET`/`HEAD /robots.txt`. The site has no webhooks.
 *
 * No Next.js imports: this runs before OpenNext loads.
 */
import { SMOKE_TEST_HEADER } from '../routing/canonical-host'
import { NON_PRODUCTION_ROBOTS_TAG, parseSiteEnvironment } from '../site-config'

export const STAGING_ACCESS_REALM = 'boxingundefeated.com staging'
export const STAGING_ACCESS_CHALLENGE = `Basic realm="${STAGING_ACCESS_REALM}", charset="UTF-8"`

export interface StagingAccessEnvironment {
  SITE_ENVIRONMENT?: string
  /** The password; set in `env.staging.vars` only (wrangler.jsonc). */
  STAGING_BASIC_AUTH_PASSWORD?: string
}

/**
 * - `none`: not the staging Worker (production, local); nothing is checked.
 * - `exempt`: an exemption; served without the password, and noindex.
 * - `passed`: the password matched; `request` is the request without `Authorization`.
 * - `refused`: the 401 to answer.
 */
export type StagingAccess =
  | { gate: 'none' }
  | { gate: 'exempt' }
  | { gate: 'passed'; request: Request }
  | { gate: 'refused'; response: Response }

/** True for the staging Worker: `SITE_ENVIRONMENT` exactly `staging`, on any host. */
export function servesAsStaging(env: StagingAccessEnvironment): boolean {
  return parseSiteEnvironment(env.SITE_ENVIRONMENT) === 'staging'
}

/** The requests served without the password (see the module comment). */
export function isStagingAccessExempt(request: Request): boolean {
  if (request.headers.has(SMOKE_TEST_HEADER)) return true
  const isRead = request.method === 'GET' || request.method === 'HEAD'
  return isRead && new URL(request.url).pathname === '/robots.txt'
}

/**
 * The password of an `Authorization: Basic` header, or null when there is none or it is
 * malformed. The username (before the first colon) is ignored.
 */
export function basicAuthPassword(header: string | null): string | null {
  const encoded = /^basic[ \t]+([A-Za-z0-9+/]+={0,2})[ \t]*$/iu.exec(header ?? '')?.[1]
  if (!encoded) return null
  let binary: string
  try {
    binary = atob(encoded)
  } catch {
    return null
  }
  const decoded = new TextDecoder().decode(Uint8Array.from(binary, char => char.charCodeAt(0)))
  const separator = decoded.indexOf(':')
  return separator === -1 ? null : decoded.slice(separator + 1)
}

function sha256(value: string): Promise<ArrayBuffer> {
  return crypto.subtle.digest('SHA-256', new TextEncoder().encode(value))
}

type TimingSafeSubtle = SubtleCrypto & {
  timingSafeEqual?: (left: ArrayBuffer, right: ArrayBuffer) => boolean
}

/**
 * Compares two SHA-256 digests in constant time: workerd's `crypto.subtle.timingSafeEqual`, or,
 * where it is missing (Node, which runs the unit tests), every byte with no early exit.
 */
function digestsEqual(left: ArrayBuffer, right: ArrayBuffer): boolean {
  const subtle = crypto.subtle as TimingSafeSubtle
  if (typeof subtle.timingSafeEqual === 'function') return subtle.timingSafeEqual(left, right)
  const a = new Uint8Array(left)
  const b = new Uint8Array(right)
  let difference = a.length ^ b.length
  for (let index = 0; index < a.length; index += 1) difference |= (a[index] ?? 0) ^ (b[index] ?? 0)
  return difference === 0
}

/** True when the request's Basic password is exactly `expected`; false when either is missing. */
export async function stagingPasswordMatches(
  request: Request,
  expected: string | undefined
): Promise<boolean> {
  if (!expected) return false
  const given = basicAuthPassword(request.headers.get('authorization'))
  if (given === null) return false
  const [givenDigest, expectedDigest] = await Promise.all([sha256(given), sha256(expected)])
  return digestsEqual(givenDigest, expectedDigest)
}

/** The 401 that asks for the password. Never cached, never indexed. */
export function stagingAccessChallenge(request: Request): Response {
  return new Response(request.method === 'HEAD' ? null : 'Staging requires a password.\n', {
    status: 401,
    headers: {
      'cache-control': 'no-store',
      'content-type': 'text/plain; charset=utf-8',
      'www-authenticate': STAGING_ACCESS_CHALLENGE,
      'x-robots-tag': NON_PRODUCTION_ROBOTS_TAG
    }
  })
}

/** The request as it goes on once it passed: the same, without its `Authorization` header. */
function withoutAuthorization(request: Request): Request {
  const headers = new Headers(request.headers)
  headers.delete('authorization')
  return new Request(request, { headers })
}

/** Staging's gate for one request (see `StagingAccess`). */
export async function stagingAccess(
  request: Request,
  env: StagingAccessEnvironment
): Promise<StagingAccess> {
  if (!servesAsStaging(env)) return { gate: 'none' }
  if (isStagingAccessExempt(request)) return { gate: 'exempt' }
  if (await stagingPasswordMatches(request, env.STAGING_BASIC_AUTH_PASSWORD)) {
    return { gate: 'passed', request: withoutAuthorization(request) }
  }
  return { gate: 'refused', response: stagingAccessChallenge(request) }
}
