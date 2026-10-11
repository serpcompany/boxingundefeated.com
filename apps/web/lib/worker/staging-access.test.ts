/**
 * @jest-environment node
 */
import { SMOKE_TEST_HEADER } from '../routing/canonical-host'
import {
  basicAuthPassword,
  isStagingAccessExempt,
  STAGING_ACCESS_CHALLENGE,
  type StagingAccessEnvironment,
  stagingAccess,
  stagingPasswordMatches
} from './staging-access'

const PASSWORD = 'unit-test-password'
const staging: StagingAccessEnvironment = {
  SITE_ENVIRONMENT: 'staging',
  STAGING_BASIC_AUTH_PASSWORD: PASSWORD
}
const origin = 'https://staging.boxingundefeated.com'

function basic(credentials: string): string {
  return `Basic ${Buffer.from(credentials, 'utf8').toString('base64')}`
}

function request(path: string, init: RequestInit & { password?: string } = {}): Request {
  const { password, ...rest } = init
  const headers = new Headers(rest.headers)
  if (password !== undefined) headers.set('authorization', basic(`staging:${password}`))
  return new Request(`${origin}${path}`, { ...rest, headers })
}

describe("staging's password check", () => {
  it('reads only the password of a Basic header, ignoring the username', () => {
    expect(basicAuthPassword(basic('staging:secret'))).toBe('secret')
    expect(basicAuthPassword(basic(':secret'))).toBe('secret')
    expect(basicAuthPassword(basic('anyone at all:secret'))).toBe('secret')
    // Only the first colon separates the username; the password may hold more.
    expect(basicAuthPassword(basic('staging:se:cr:et'))).toBe('se:cr:et')
    expect(basicAuthPassword(basic('staging:pässwörd'))).toBe('pässwörd')
    expect(basicAuthPassword(basic('staging:'))).toBe('')
    // The scheme is case-insensitive (RFC 7617).
    expect(basicAuthPassword(`basic ${btoa('staging:secret')}`)).toBe('secret')
    expect(basicAuthPassword(`BASIC  ${btoa('staging:secret')} `)).toBe('secret')
    for (const header of [
      null,
      '',
      'Basic',
      'Basic ',
      `Bearer ${btoa('staging:secret')}`,
      `Basic ${btoa('no-colon')}`,
      'Basic not base64!',
      'Basic ====',
      `Basic ${btoa('staging:secret')} extra`
    ]) {
      expect(basicAuthPassword(header)).toBeNull()
    }
  })

  it('matches the exact password, and nothing when either side is missing', async () => {
    const match = (password: string | undefined, expected: string | undefined) =>
      stagingPasswordMatches(request('/', { password }), expected)
    expect(await match(PASSWORD, PASSWORD)).toBe(true)
    for (const wrong of ['', 'unit-test-passwor', `${PASSWORD} `, 'UNIT-TEST-PASSWORD']) {
      expect(await match(wrong, PASSWORD)).toBe(false)
    }
    // Fail closed: without the var, no password matches, not even an empty one.
    expect(await match('', undefined)).toBe(false)
    expect(await match('', '')).toBe(false)
    expect(await match(PASSWORD, undefined)).toBe(false)
    expect(await stagingPasswordMatches(request('/'), PASSWORD)).toBe(false)
  })

  it("compares SHA-256 digests with workerd's crypto.subtle.timingSafeEqual when it exists", async () => {
    const subtle = crypto.subtle as SubtleCrypto & { timingSafeEqual?: unknown }
    const timingSafeEqual = jest.fn((left: ArrayBuffer, right: ArrayBuffer) => {
      expect(left.byteLength).toBe(32)
      expect(right.byteLength).toBe(32)
      return Buffer.from(left).equals(Buffer.from(right))
    })
    subtle.timingSafeEqual = timingSafeEqual
    try {
      expect(await stagingPasswordMatches(request('/', { password: PASSWORD }), PASSWORD)).toBe(
        true
      )
      // Different lengths still reach the comparison as equal-length digests.
      expect(await stagingPasswordMatches(request('/', { password: 'x' }), PASSWORD)).toBe(false)
      expect(timingSafeEqual).toHaveBeenCalledTimes(2)
    } finally {
      delete subtle.timingSafeEqual
    }
  })
})

describe("staging's exemptions", () => {
  it('lets the smoke-test header and robots.txt through', () => {
    expect(
      isStagingAccessExempt(request('/about/', { headers: { [SMOKE_TEST_HEADER]: '1' } }))
    ).toBe(true)
    expect(
      isStagingAccessExempt(request('/boxers/', { headers: { [SMOKE_TEST_HEADER]: '' } }))
    ).toBe(true)
    expect(isStagingAccessExempt(request('/robots.txt'))).toBe(true)
    expect(isStagingAccessExempt(request('/robots.txt', { method: 'HEAD' }))).toBe(true)
  })

  it('exempts nothing else', () => {
    for (const [path, method] of [
      ['/', 'GET'],
      ['/robots.txt/', 'GET'],
      ['/robots.txt', 'POST'],
      ['/ROBOTS.TXT', 'GET'],
      ['/sitemap-index.xml', 'GET'],
      ['/sitemap.xml', 'GET'],
      ['/ads.txt', 'GET'],
      ['/api/search?q=ali', 'GET'],
      ['/_next/image?url=%2Flogo.png&w=64&q=75', 'GET']
    ] as const) {
      expect(isStagingAccessExempt(request(path, { method }))).toBe(false)
    }
  })
})

describe("staging's gate", () => {
  it('asks for the password with a 401 nobody caches or indexes', async () => {
    const access = await stagingAccess(request('/about/'), staging)
    if (access.gate !== 'refused') throw new Error(`expected a refusal, got ${access.gate}`)
    expect(access.response.status).toBe(401)
    expect(access.response.headers.get('www-authenticate')).toBe(STAGING_ACCESS_CHALLENGE)
    expect(STAGING_ACCESS_CHALLENGE).toBe(
      'Basic realm="boxingundefeated.com staging", charset="UTF-8"'
    )
    expect(access.response.headers.get('cache-control')).toBe('no-store')
    expect(access.response.headers.get('x-robots-tag')).toBe('noindex')
    expect(await access.response.text()).toBe('Staging requires a password.\n')

    const head = await stagingAccess(request('/about/', { method: 'HEAD' }), staging)
    expect(head.gate === 'refused' && head.response.body).toBeNull()
    for (const password of ['wrong', '']) {
      expect((await stagingAccess(request('/', { password }), staging)).gate).toBe('refused')
    }
  })

  it('passes the password with any username, and drops the Authorization header', async () => {
    for (const username of ['staging', '', 'ahrefs']) {
      const sent = new Request(`${origin}/boxers/?page=2`, {
        headers: {
          accept: 'text/html',
          authorization: basic(`${username}:${PASSWORD}`),
          'user-agent': 'AhrefsSiteAudit/6.1'
        }
      })
      const access = await stagingAccess(sent, staging)
      if (access.gate !== 'passed') throw new Error(`${username}: ${access.gate}`)
      expect(access.request.url).toBe(sent.url)
      expect(access.request.headers.has('authorization')).toBe(false)
      expect(access.request.headers.get('accept')).toBe('text/html')
      expect(access.request.headers.get('user-agent')).toBe('AhrefsSiteAudit/6.1')
    }
  })

  it('fails closed without the password var: only the exemptions are served', async () => {
    for (const env of [
      { SITE_ENVIRONMENT: 'staging' },
      { SITE_ENVIRONMENT: 'staging', STAGING_BASIC_AUTH_PASSWORD: '' }
    ]) {
      expect((await stagingAccess(request('/', { password: '' }), env)).gate).toBe('refused')
      expect((await stagingAccess(request('/', { password: PASSWORD }), env)).gate).toBe('refused')
      expect((await stagingAccess(request('/robots.txt'), env)).gate).toBe('exempt')
      expect(
        (await stagingAccess(request('/', { headers: { [SMOKE_TEST_HEADER]: '1' } }), env)).gate
      ).toBe('exempt')
    }
  })

  it('keeps an exempt request exempt even with the password, so it keeps its noindex', async () => {
    const smoke = request('/', { headers: { [SMOKE_TEST_HEADER]: '1' }, password: PASSWORD })
    expect((await stagingAccess(smoke, staging)).gate).toBe('exempt')
    expect(
      (await stagingAccess(request('/robots.txt', { password: PASSWORD }), staging)).gate
    ).toBe('exempt')
  })

  it('never gates production, local or an unknown environment, whatever they are sent', async () => {
    for (const env of [
      { SITE_ENVIRONMENT: 'production' },
      { SITE_ENVIRONMENT: 'production', STAGING_BASIC_AUTH_PASSWORD: PASSWORD },
      { SITE_ENVIRONMENT: 'local' },
      { SITE_ENVIRONMENT: 'local', STAGING_BASIC_AUTH_PASSWORD: PASSWORD },
      { SITE_ENVIRONMENT: 'Staging' },
      {}
    ] satisfies StagingAccessEnvironment[]) {
      for (const sent of [request('/'), request('/', { password: 'wrong' })]) {
        expect((await stagingAccess(sent, env)).gate).toBe('none')
      }
    }
  })
})
