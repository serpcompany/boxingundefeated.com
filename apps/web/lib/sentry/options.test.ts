/**
 * @jest-environment node
 */
import type { Integration } from '@sentry/core'
import {
  BROWSER_INTEGRATIONS,
  browserSentryBuildEnv,
  buildSentryOptions,
  keepIntegrations,
  sentryRelease,
  toUploadedWorkerFilename,
  WORKER_INTEGRATIONS
} from './options'

const DSN = 'https://public@o1.ingest.sentry.io/1'

describe('buildSentryOptions', () => {
  it('is off without a DSN', () => {
    for (const dsn of [undefined, '', '  ']) {
      const options = buildSentryOptions({ dsn, siteEnvironment: 'production', release: '1+a' })
      expect(options.enabled).toBe(false)
      expect(options.dsn).toBeUndefined()
    }
  })

  it('is off outside staging and production, even with a DSN', () => {
    for (const siteEnvironment of [undefined, 'local', 'Production', 'preview']) {
      const options = buildSentryOptions({ dsn: DSN, siteEnvironment })
      expect(options).toMatchObject({ enabled: false, environment: 'local' })
      expect(options.dsn).toBeUndefined()
    }
  })

  it('is on in staging and production with a DSN, tagged with the environment and release', () => {
    expect(
      buildSentryOptions({ dsn: ` ${DSN} `, siteEnvironment: 'staging', release: '0.1.0+abc' })
    ).toMatchObject({
      enabled: true,
      dsn: DSN,
      environment: 'staging',
      dist: 'staging',
      release: '0.1.0+abc'
    })
    expect(buildSentryOptions({ dsn: DSN, siteEnvironment: 'production' })).toMatchObject({
      enabled: true,
      environment: 'production'
    })
    expect(buildSentryOptions({ dsn: DSN, siteEnvironment: 'production' })).not.toHaveProperty(
      'release'
    )
  })

  it('collects nothing about the person or the request, and traces nothing', () => {
    const options = buildSentryOptions({ dsn: DSN, siteEnvironment: 'production' })
    expect(options.dataCollection).toEqual({
      userInfo: false,
      cookies: false,
      httpHeaders: false,
      httpBodies: [],
      urlQueryParams: false,
      graphQL: { document: false, variables: false },
      genAI: { inputs: false, outputs: false },
      databaseQueryData: false,
      queues: false,
      stackFrameVariables: false,
      frameContextLines: 0
    })
    expect(options.tracesSampleRate).toBeUndefined()
    expect(options).not.toHaveProperty('replaysSessionSampleRate')
    expect(options).not.toHaveProperty('profilesSampleRate')
    expect(typeof options.beforeSend).toBe('function')
    expect(typeof options.beforeBreadcrumb).toBe('function')
  })
})

describe('sentryRelease', () => {
  it('is <version>+<commit>, and none for an unknown commit', () => {
    expect(sentryRelease('0.1.0', 'abc123')).toBe('0.1.0+abc123')
    expect(sentryRelease('0.1.0', 'unknown')).toBeUndefined()
    expect(sentryRelease('0.1.0', '')).toBeUndefined()
    expect(sentryRelease('0.1.0', undefined)).toBeUndefined()
  })
})

describe('browserSentryBuildEnv', () => {
  it('is empty, and never asks for the release, unless Sentry is on', () => {
    const release = jest.fn(() => '0.1.0+abc')
    const empty = {
      NEXT_PUBLIC_SENTRY_DSN: '',
      NEXT_PUBLIC_SENTRY_ENVIRONMENT: '',
      NEXT_PUBLIC_SENTRY_RELEASE: ''
    }
    expect(
      browserSentryBuildEnv({ dsn: undefined, siteEnvironment: 'production', release })
    ).toEqual(empty)
    expect(browserSentryBuildEnv({ dsn: DSN, siteEnvironment: 'local', release })).toEqual(empty)
    expect(release).not.toHaveBeenCalled()
  })

  it('carries the DSN, environment and release of a staging or production build', () => {
    expect(
      browserSentryBuildEnv({ dsn: DSN, siteEnvironment: 'staging', release: () => '0.1.0+abc' })
    ).toEqual({
      NEXT_PUBLIC_SENTRY_DSN: DSN,
      NEXT_PUBLIC_SENTRY_ENVIRONMENT: 'staging',
      NEXT_PUBLIC_SENTRY_RELEASE: '0.1.0+abc'
    })
  })
})

describe('keepIntegrations', () => {
  const named = (name: string): Integration => ({ name })

  it('keeps error capture; drops sessions, tracing, console capture and trace headers', () => {
    const browser = keepIntegrations(
      [
        'EventFilters',
        'GlobalHandlers',
        'BrowserSession',
        'BrowserTracing',
        'Console',
        'CultureContext',
        'Replay'
      ].map(named),
      BROWSER_INTEGRATIONS
    ).map(integration => integration.name)
    expect(browser).toEqual(['EventFilters', 'GlobalHandlers'])

    const worker = keepIntegrations(
      ['Dedupe', 'Nextjs', 'RequestData', 'Fetch', 'Console', 'HttpServer', 'NextjsUseCache'].map(
        named
      ),
      WORKER_INTEGRATIONS
    ).map(integration => integration.name)
    expect(worker).toEqual(['Dedupe', 'Nextjs', 'RequestData'])
  })
})

describe('toUploadedWorkerFilename', () => {
  it('names bundled Worker modules like the uploaded bundle', () => {
    expect(toUploadedWorkerFilename('worker.js')).toBe('app:///worker.js')
    expect(toUploadedWorkerFilename('/worker.js')).toBe('app:///worker.js')
    expect(toUploadedWorkerFilename('/bundle/worker.js')).toBe('app:///worker.js')
  })

  it('leaves frames that already have a scheme, or are not scripts', () => {
    expect(toUploadedWorkerFilename('app:///worker.js')).toBe('app:///worker.js')
    expect(toUploadedWorkerFilename('node:internal/process')).toBe('node:internal/process')
    expect(toUploadedWorkerFilename('<anonymous>')).toBe('<anonymous>')
    expect(toUploadedWorkerFilename(undefined)).toBeUndefined()
  })
})
