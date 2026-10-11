/**
 * @jest-environment node
 */
import type { ErrorEvent } from '@sentry/core'
import {
  MAX_BREADCRUMBS,
  MAX_TEXT_LENGTH,
  scrubBreadcrumb,
  scrubEvent,
  scrubText,
  scrubUrl
} from './scrub'

const SECRET = 'seeded-secret-7f3a'

/** An event with everything an SDK or integration could attach, seeded with a secret. */
function seededEvent(): ErrorEvent {
  return {
    type: undefined,
    event_id: 'abc123',
    timestamp: 1760000000,
    level: 'error',
    platform: 'javascript',
    release: '0.1.0+deadbeef',
    dist: 'staging',
    environment: 'staging',
    server_name: `host-${SECRET}`,
    transaction: `/search/?q=${SECRET}`,
    message: `Failed https://boxingundefeated.com/api/search?q=${SECRET}#frag`,
    user: { id: SECRET, email: `${SECRET}@example.com`, ip_address: '203.0.113.9' },
    extra: { token: SECRET },
    modules: { secret: SECRET },
    tags: { boundary: 'route', next_digest: '12345', session: SECRET },
    contexts: {
      trace: { trace_id: 't'.repeat(32), span_id: 's'.repeat(16), data: { secret: SECRET } },
      runtime: { name: 'cloudflare', version: '1' },
      culture: { locale: 'en-US', timezone: 'Europe/Berlin' },
      cloud_resource: { 'cloud.provider': 'cloudflare' },
      nextjs: {
        request_path: `/boxers/x/?q=${SECRET}`,
        router_kind: 'App Router',
        router_path: '/boxers/[slug]',
        route_type: 'render',
        secret: SECRET
      }
    },
    request: {
      url: `https://staging.boxingundefeated.com/search/?q=${SECRET}#top`,
      method: 'GET',
      query_string: `q=${SECRET}`,
      cookies: { session: SECRET },
      data: SECRET,
      env: { REMOTE_ADDR: '203.0.113.9' },
      headers: {
        'user-agent': 'Mozilla',
        cookie: `session=${SECRET}`,
        'x-forwarded-for': '203.0.113.9'
      }
    },
    exception: {
      values: [
        {
          type: 'TypeError',
          value: `Cannot read x of https://example.com/path?token=${SECRET}`,
          mechanism: { type: 'onerror', handled: false, data: { secret: SECRET } },
          stacktrace: {
            frames: [
              {
                filename: `https://boxingundefeated.com/_next/static/chunks/a.js?v=${SECRET}`,
                abs_path: `https://boxingundefeated.com/_next/static/chunks/a.js?v=${SECRET}`,
                function: 'render',
                lineno: 1,
                colno: 2,
                in_app: true,
                debug_id: 'debug-id-1',
                context_line: `const token = "${SECRET}"`,
                pre_context: [SECRET],
                post_context: [SECRET],
                vars: { token: SECRET }
              }
            ]
          }
        }
      ]
    },
    breadcrumbs: [
      { category: 'console', message: SECRET, data: { arguments: [SECRET] } },
      { category: 'ui.input', message: 'input#search' },
      { category: 'navigation', data: { from: `/search/?q=${SECRET}`, to: '/boxers/' } },
      {
        category: 'fetch',
        type: 'http',
        data: { method: 'GET', url: `/api/search?q=${SECRET}`, status_code: 200, body: SECRET }
      },
      { category: 'ui.click', message: 'button.search', data: { value: SECRET } }
    ],
    debug_meta: { images: [{ type: 'sourcemap', code_file: 'a.js', debug_id: 'debug-id-1' }] },
    sdk: { name: 'sentry.javascript.nextjs', version: '11.6.0' }
  }
}

describe('scrubEvent', () => {
  it('keeps no trace of a seeded secret, user, IP address, cookie or header', () => {
    const sent = JSON.stringify(scrubEvent(seededEvent()))
    expect(sent).not.toContain(SECRET)
    expect(sent).not.toContain('203.0.113.9')
    expect(sent).not.toMatch(/cookie|user-agent|ip_address|server_name|"user"|"extra"/i)
  })

  it('keeps the fields that identify and locate the error', () => {
    const event = scrubEvent(seededEvent())
    expect(event).toMatchObject({
      event_id: 'abc123',
      level: 'error',
      release: '0.1.0+deadbeef',
      dist: 'staging',
      environment: 'staging',
      transaction: '/search/',
      message: 'Failed https://boxingundefeated.com/api/search',
      tags: { boundary: 'route', next_digest: '12345' },
      request: { url: 'https://staging.boxingundefeated.com/search/', method: 'GET' },
      debug_meta: { images: [{ type: 'sourcemap', code_file: 'a.js', debug_id: 'debug-id-1' }] },
      sdk: { name: 'sentry.javascript.nextjs', version: '11.6.0' }
    })
    expect(event.contexts).toEqual({
      trace: { trace_id: 't'.repeat(32), span_id: 's'.repeat(16) },
      runtime: { name: 'cloudflare', version: '1' },
      nextjs: {
        request_path: '/boxers/x/',
        router_kind: 'App Router',
        router_path: '/boxers/[slug]',
        route_type: 'render'
      }
    })
    expect(event.exception?.values).toEqual([
      {
        type: 'TypeError',
        value: 'Cannot read x of https://example.com/path',
        mechanism: { type: 'onerror', handled: false },
        stacktrace: {
          frames: [
            {
              filename: 'https://boxingundefeated.com/_next/static/chunks/a.js',
              abs_path: 'https://boxingundefeated.com/_next/static/chunks/a.js',
              function: 'render',
              lineno: 1,
              colno: 2,
              in_app: true,
              debug_id: 'debug-id-1'
            }
          ]
        }
      }
    ])
  })

  it('keeps only page-activity breadcrumbs, without their payloads', () => {
    expect(scrubEvent(seededEvent()).breadcrumbs).toEqual([
      { category: 'navigation', data: { from: '/search/', to: '/boxers/' } },
      {
        category: 'fetch',
        type: 'http',
        data: { method: 'GET', url: '/api/search', status_code: 200 }
      },
      { category: 'ui.click', message: 'button.search' }
    ])
  })

  it('bounds free text and the number of breadcrumbs', () => {
    const event = seededEvent()
    event.exception = { values: [{ type: 'Error', value: 'x'.repeat(10_000) }] }
    event.breadcrumbs = Array.from({ length: 100 }, (_, index) => ({
      category: 'navigation',
      data: { to: `/page-${index}/` }
    }))
    const scrubbed = scrubEvent(event)
    expect(scrubbed.exception?.values?.[0]?.value).toHaveLength(MAX_TEXT_LENGTH)
    expect(scrubbed.breadcrumbs).toHaveLength(MAX_BREADCRUMBS)
    expect(scrubbed.breadcrumbs?.at(-1)?.data).toEqual({ to: '/page-99/' })
  })

  it('handles a bare event', () => {
    expect(scrubEvent({ type: undefined })).toEqual({})
  })
})

describe('scrubBreadcrumb', () => {
  it('drops console, input and unknown breadcrumbs', () => {
    expect(scrubBreadcrumb({ category: 'console', message: SECRET })).toBeNull()
    expect(scrubBreadcrumb({ category: 'ui.input', message: 'input' })).toBeNull()
    expect(scrubBreadcrumb({ message: SECRET })).toBeNull()
  })
})

describe('scrubUrl and scrubText', () => {
  it('removes query strings and fragments from URLs', () => {
    expect(scrubUrl(`https://boxingundefeated.com/search/?q=${SECRET}#top`)).toBe(
      'https://boxingundefeated.com/search/'
    )
    expect(scrubUrl(`/api/search?q=${SECRET}`)).toBe('/api/search')
    expect(scrubUrl('/boxers/manuel-ortiz/')).toBe('/boxers/manuel-ortiz/')
  })

  it('removes query strings from URLs inside free text', () => {
    expect(scrubText(`GET /api/search?q=${SECRET} failed`)).toBe('GET /api/search failed')
    expect(scrubText(`see https://react.dev/errors/418?args[]=${SECRET}`)).toBe(
      'see https://react.dev/errors/418'
    )
    expect(scrubText('Minified React error #418')).toBe('Minified React error #418')
  })
})
