import { describe, expect, it } from 'vitest'
import { resolveTarget, SMOKE_TEST_HEADER } from './target'

describe('resolveTarget', () => {
  it('defaults to the local preview with the local config', () => {
    expect(resolveTarget({})).toEqual({
      baseUrl: 'http://localhost:8787',
      environment: 'local',
      canonicalOrigin: 'http://localhost:8787',
      headers: {},
      isLocal: true,
      nonCanonicalHosts: []
    })
  })

  it('needs EXPECT_ENV with BASE_URL, and a known one', () => {
    expect(() => resolveTarget({ BASE_URL: 'https://staging.boxingundefeated.com' })).toThrow(
      /EXPECT_ENV/
    )
    expect(() => resolveTarget({ EXPECT_ENV: 'prod' })).toThrow(/EXPECT_ENV must be one of/)
  })

  it('tests staging on its custom domain and its workers.dev host', () => {
    const target = resolveTarget({
      BASE_URL: 'https://staging.boxingundefeated.com/',
      EXPECT_ENV: 'staging'
    })
    expect(target).toMatchObject({
      baseUrl: 'https://staging.boxingundefeated.com',
      canonicalOrigin: 'https://staging.boxingundefeated.com',
      headers: {},
      isLocal: false
    })
    expect(target.nonCanonicalHosts).toEqual([
      {
        host: 'boxingundefeated-com-staging.serpcompany.workers.dev',
        url: 'https://boxingundefeated-com-staging.serpcompany.workers.dev',
        headers: {}
      }
    ])
  })

  it('sends the smoke-test header to a workers.dev target, and tests that host without it', () => {
    const target = resolveTarget({
      BASE_URL: 'https://boxingundefeated-com-production.serpcompany.workers.dev',
      EXPECT_ENV: 'production'
    })
    expect(target.headers).toEqual({ [SMOKE_TEST_HEADER]: '1' })
    expect(target.canonicalOrigin).toBe('https://boxingundefeated.com')
    expect(target.nonCanonicalHosts.map(host => host.host)).toEqual([
      'boxingundefeated-com-production.serpcompany.workers.dev'
    ])
  })

  it('adds www for the apex, and reaches every host through a local preview by Host header', () => {
    const apex = resolveTarget({
      BASE_URL: 'https://boxingundefeated.com',
      EXPECT_ENV: 'production'
    })
    expect(apex.nonCanonicalHosts.map(host => host.host)).toContain('www.boxingundefeated.com')

    const local = resolveTarget({ BASE_URL: 'http://localhost:8805', EXPECT_ENV: 'production' })
    expect(local.nonCanonicalHosts).toEqual([
      {
        host: 'boxingundefeated-com-production.serpcompany.workers.dev',
        url: 'http://localhost:8805',
        headers: { host: 'boxingundefeated-com-production.serpcompany.workers.dev' }
      },
      {
        host: 'www.boxingundefeated.com',
        url: 'http://localhost:8805',
        headers: { host: 'www.boxingundefeated.com' }
      }
    ])
  })

  it('takes the canonical origin and the host list from the environment', () => {
    const target = resolveTarget({
      BASE_URL: 'http://127.0.0.1:3000',
      EXPECT_ENV: 'local',
      CANONICAL_ORIGIN: 'http://localhost:3000/',
      NON_CANONICAL_HOSTS: ' a.workers.dev, ,b.example '
    })
    expect(target.canonicalOrigin).toBe('http://localhost:3000')
    expect(target.nonCanonicalHosts.map(host => host.host)).toEqual(['a.workers.dev', 'b.example'])
    expect(
      resolveTarget({ EXPECT_ENV: 'production', NON_CANONICAL_HOSTS: '' }).nonCanonicalHosts
    ).toEqual([])
  })
})
