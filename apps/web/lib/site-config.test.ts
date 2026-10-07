/**
 * @jest-environment node
 */
import fs from 'node:fs'
import path from 'node:path'
import { createRootMetadata } from './metadata'
import { NON_PRODUCTION_ROBOTS_TXT, robotsFor } from './robots'
import {
  GTM_ID,
  getSiteConfig,
  PRODUCTION_ORIGIN,
  resolveSiteEnvironment,
  type SiteConfigInput,
  STAGING_ORIGIN
} from './site-config'

const workerRuntime: SiteConfigInput = {}

describe('resolveSiteEnvironment', () => {
  it.each(['local', 'staging', 'production'] as const)('uses an explicit %s', environment => {
    expect(resolveSiteEnvironment({ siteEnvironment: environment })).toBe(environment)
  })

  it.each([
    ['nothing set', {}],
    ['an empty value', { siteEnvironment: '' }]
  ])('falls back to local for %s', (_name, input: SiteConfigInput) => {
    expect(resolveSiteEnvironment(input)).toBe('local')
  })

  it.each(['Production', 'prod', ' production', 'preview'])(
    'treats the unknown value %j as local',
    value => {
      expect(resolveSiteEnvironment({ siteEnvironment: value })).toBe('local')
    }
  )
})

describe('getSiteConfig', () => {
  it('gives each environment its origin', () => {
    expect(getSiteConfig({ siteEnvironment: 'production' }).origin).toBe(PRODUCTION_ORIGIN)
    expect(getSiteConfig({ siteEnvironment: 'staging' }).origin).toBe(STAGING_ORIGIN)
    expect(getSiteConfig({ siteEnvironment: 'local' }).origin).toBe('http://localhost:8787')
    expect(getSiteConfig({ siteEnvironment: 'local', port: '3003' }).origin).toBe(
      'http://localhost:3003'
    )
    expect(getSiteConfig(workerRuntime).origin).toBe('http://localhost:8787')
  })

  it('renders Google Tag Manager only in production', () => {
    expect(getSiteConfig({ siteEnvironment: 'production' }).gtmId).toBe(GTM_ID)
    expect(getSiteConfig({ siteEnvironment: 'staging' }).gtmId).toBeNull()
    expect(getSiteConfig({ siteEnvironment: 'local' }).gtmId).toBeNull()
    expect(getSiteConfig(workerRuntime).gtmId).toBeNull()
  })

  it('reads process.env when it is called, not when the module loads', () => {
    const original = process.env.SITE_ENVIRONMENT
    try {
      process.env.SITE_ENVIRONMENT = 'staging'
      expect(getSiteConfig().origin).toBe(STAGING_ORIGIN)
      process.env.SITE_ENVIRONMENT = 'production'
      expect(getSiteConfig().origin).toBe(PRODUCTION_ORIGIN)
    } finally {
      if (original === undefined) delete process.env.SITE_ENVIRONMENT
      else process.env.SITE_ENVIRONMENT = original
    }
  })
})

describe('environment-dependent output', () => {
  const production = getSiteConfig({ siteEnvironment: 'production' })
  const staging = getSiteConfig({ siteEnvironment: 'staging' })

  it('allows crawling and lists the sitemap index only in production', () => {
    expect(robotsFor(production)).toEqual({
      rules: { userAgent: '*', allow: '/' },
      sitemap: 'https://boxingundefeated.com/sitemap-index.xml'
    })
    expect(robotsFor(staging)).toEqual({ rules: { userAgent: '*', disallow: '/' } })
    expect(robotsFor(getSiteConfig({}))).toEqual({ rules: { userAgent: '*', disallow: '/' } })
    expect(NON_PRODUCTION_ROBOTS_TXT).toBe('User-agent: *\nDisallow: /\n')
  })

  it('adds noindex to the root metadata outside production', () => {
    expect(createRootMetadata(production).robots).toBeUndefined()
    expect(createRootMetadata(staging).robots).toBe('noindex')
    expect(createRootMetadata(getSiteConfig({})).robots).toBe('noindex')
  })

  it('uses the environment origin for metadataBase, which page canonicals resolve against', () => {
    const metadata = createRootMetadata(staging)

    expect(metadata.metadataBase).toEqual(new URL(STAGING_ORIGIN))
    // Every page would inherit a root canonical; each page sets its own.
    expect(metadata.alternates?.canonical).toBeUndefined()
  })
})

describe('wrangler.jsonc', () => {
  // The top level is local; JSONC comments are whole lines in this file.
  const source = fs.readFileSync(path.join(__dirname, '..', 'wrangler.jsonc'), 'utf8')
  const config = JSON.parse(source.replace(/^\s*\/\/.*$/gm, ''))

  it('sets SITE_ENVIRONMENT explicitly in every environment', () => {
    expect(config.vars.SITE_ENVIRONMENT).toBe('local')
    expect(config.env.staging.vars.SITE_ENVIRONMENT).toBe('staging')
    expect(config.env.production.vars.SITE_ENVIRONMENT).toBe('production')
  })

  it('turns the canonical-host redirect on for staging and production, and off locally', () => {
    expect(config.vars.CANONICAL_HOST_REDIRECT).toBe('off')
    expect(config.env.staging.vars.CANONICAL_HOST_REDIRECT).toBe('on')
    expect(config.env.production.vars.CANONICAL_HOST_REDIRECT).toBe('on')
  })

  it('runs the Worker before every file except /_next/static/, in every env', () => {
    // Set once at the top level, which the named envs inherit and OpenNext reads at build time.
    expect(config.assets.run_worker_first).toEqual(['/*', '!/_next/static/*'])
    expect(config.env.staging.assets).toBeUndefined()
    expect(config.env.production.assets).toBeUndefined()
  })

  it('attaches the custom domains of each environment, the apex first for production', () => {
    expect(config.env.staging.routes).toEqual([
      { pattern: 'staging.boxingundefeated.com', custom_domain: true }
    ])
    // The first route is the host `wrangler dev` infers, and every deploy replaces the Worker's
    // custom domains with this list.
    expect(config.env.production.routes).toEqual([
      { pattern: 'boxingundefeated.com', custom_domain: true },
      { pattern: 'www.boxingundefeated.com', custom_domain: true }
    ])
    expect(config.routes).toBeUndefined()
  })
})
