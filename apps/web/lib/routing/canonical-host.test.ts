/**
 * @jest-environment node
 */
import {
  type CanonicalHostEnvironment,
  canonicalHostOrigin,
  canonicalHostRedirect,
  SMOKE_TEST_HEADER
} from './canonical-host'

const production = { SITE_ENVIRONMENT: 'production', CANONICAL_HOST_REDIRECT: 'on' }
const staging = { SITE_ENVIRONMENT: 'staging', CANONICAL_HOST_REDIRECT: 'on' }

const WWW = 'https://www.boxingundefeated.com'
const WORKERS_DEV = 'https://boxingundefeated-com-production.serp.workers.dev'
const PREVIEW = 'https://abc123-boxingundefeated-com-production.serp.workers.dev'

function redirect(url: string, env: CanonicalHostEnvironment, headers?: HeadersInit) {
  return canonicalHostRedirect(new Request(url, { headers }), env)
}

describe('canonicalHostOrigin', () => {
  it('is the environment origin only for a deployed environment with the switch on', () => {
    expect(canonicalHostOrigin(production)).toBe('https://boxingundefeated.com')
    expect(canonicalHostOrigin(staging)).toBe('https://staging.boxingundefeated.com')
    expect(canonicalHostOrigin({ ...production, CANONICAL_HOST_REDIRECT: 'off' })).toBeNull()
    expect(canonicalHostOrigin({ ...production, CANONICAL_HOST_REDIRECT: 'On' })).toBeNull()
    expect(canonicalHostOrigin({ SITE_ENVIRONMENT: 'production' })).toBeNull()
    expect(canonicalHostOrigin({ ...production, SITE_ENVIRONMENT: 'local' })).toBeNull()
    expect(canonicalHostOrigin({ ...production, SITE_ENVIRONMENT: 'prod' })).toBeNull()
    expect(canonicalHostOrigin({ CANONICAL_HOST_REDIRECT: 'on' })).toBeNull()
  })
})

describe('canonicalHostRedirect', () => {
  it.each<[string, string, string]>([
    // [request, location, case]
    [`${WWW}/`, 'https://boxingundefeated.com/', 'homepage'],
    [`${WWW}/boxers/len-wickwar/`, 'https://boxingundefeated.com/boxers/len-wickwar/', 'page'],
    // One hop: the slash is fixed in the same redirect.
    [`${WWW}/boxers/len-wickwar`, 'https://boxingundefeated.com/boxers/len-wickwar/', 'page'],
    [`${WWW}/robots.txt/`, 'https://boxingundefeated.com/robots.txt', 'file'],
    [`${WWW}/sitemap-index.xml`, 'https://boxingundefeated.com/sitemap-index.xml', 'file'],
    // Old sitemap URLs go straight to the index, not to the path the Worker would redirect next.
    [`${WWW}/sitemap.xml`, 'https://boxingundefeated.com/sitemap-index.xml', 'old sitemap'],
    [`${WWW}/sitemap.xml/?x=1`, 'https://boxingundefeated.com/sitemap-index.xml', 'old sitemap'],
    [
      `${WWW}/sitemaps/pages/1.xml/`,
      'https://boxingundefeated.com/sitemap-index.xml',
      'old sitemap'
    ],
    [`${WWW}/about?ref=x&b=1`, 'https://boxingundefeated.com/about/?ref=x&b=1', 'query'],
    // Files from public/ reach the Worker too (assets.run_worker_first).
    [`${WWW}/ads.txt`, 'https://boxingundefeated.com/ads.txt', 'file'],
    [`${WWW}/data/boxers/x.json`, 'https://boxingundefeated.com/data/boxers/x.json', 'file'],
    // Repeated slashes collapse in the same hop.
    [`${WWW}//about`, 'https://boxingundefeated.com/about/', 'repeated slashes'],
    [`${WWW}/boxers//x//`, 'https://boxingundefeated.com/boxers/x/', 'repeated slashes'],
    [`${WWW}//robots.txt/`, 'https://boxingundefeated.com/robots.txt', 'repeated slashes'],
    [`${WWW}/api//x`, 'https://boxingundefeated.com/api//x', 'api'],
    // /api keeps its exact path.
    [`${WWW}/api`, 'https://boxingundefeated.com/api', 'api'],
    [`${WWW}/api/`, 'https://boxingundefeated.com/api/', 'api'],
    [`${WWW}/api/anything`, 'https://boxingundefeated.com/api/anything', 'api'],
    [`${WWW}/API/x.json/`, 'https://boxingundefeated.com/API/x.json/', 'api'],
    [
      `${WWW}/.well-known/security.txt`,
      'https://boxingundefeated.com/.well-known/security.txt',
      ''
    ],
    [`${WORKERS_DEV}/divisions/heavy`, 'https://boxingundefeated.com/divisions/heavy/', 'workers'],
    [`${WORKERS_DEV}/api/search`, 'https://boxingundefeated.com/api/search', 'workers'],
    [`${PREVIEW}/about/`, 'https://boxingundefeated.com/about/', 'preview URL'],
    ['https://WWW.BoxingUndefeated.com/about/', 'https://boxingundefeated.com/about/', 'case']
  ])('sends %s to %s (%s) in production', async (url, location) => {
    const response = redirect(url, production)

    expect(response?.status).toBe(308)
    expect(response?.headers.get('location')).toBe(location)
    expect(await response?.text()).toBe('')
  })

  it('sends the staging workers.dev host to the staging origin', () => {
    const response = redirect(
      'https://boxingundefeated-com-staging.serp.workers.dev/about',
      staging
    )

    expect(response?.status).toBe(308)
    expect(response?.headers.get('location')).toBe('https://staging.boxingundefeated.com/about/')
  })

  it.each([
    ['the canonical host', 'https://boxingundefeated.com/about', production],
    ['the staging host', 'https://staging.boxingundefeated.com/about', staging],
    ['another subdomain', 'https://shop.boxingundefeated.com/about', production],
    ['a lookalike host', 'https://workers.dev.example.com/about', production],
    ['localhost', 'http://localhost:8787/about', production],
    ['www with the switch off', `${WWW}/about`, { ...production, CANONICAL_HOST_REDIRECT: 'off' }],
    ['workers.dev with the switch off', `${WORKERS_DEV}/about`, { SITE_ENVIRONMENT: 'staging' }],
    ['a local Worker', `${WORKERS_DEV}/about`, { CANONICAL_HOST_REDIRECT: 'on' }]
  ])('leaves %s alone', (_name, url, env) => {
    expect(redirect(url, env)).toBeNull()
  })

  it('exempts requests that carry the smoke-test header, whatever its value', () => {
    for (const url of [`${WWW}/about`, `${WORKERS_DEV}/`, `${WORKERS_DEV}/api/anything`]) {
      expect(redirect(url, production, { [SMOKE_TEST_HEADER]: '1' })).toBeNull()
      expect(redirect(url, production, { [SMOKE_TEST_HEADER]: '' })).toBeNull()
      expect(redirect(url, staging, { 'X-BoxingUndefeated-Smoke-Test': 'ci' })).toBeNull()
    }
  })

  it('redirects every method with 308, so a POST stays a POST', () => {
    const response = canonicalHostRedirect(
      new Request(`${WWW}/api/anything`, { method: 'POST', body: '{}' }),
      production
    )
    expect(response?.status).toBe(308)
    expect(response?.headers.get('location')).toBe('https://boxingundefeated.com/api/anything')
  })
})
