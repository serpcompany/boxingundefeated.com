/**
 * @jest-environment node
 */
import {
  type SentryWorkerEnvironment,
  type WorkerFetchHandler,
  withKnownLength,
  withSentryWhenEnabled
} from './worker'

const DSN = 'https://public@o1.ingest.sentry.io/1'
const ctx = {} as ExecutionContext

function plainHandler() {
  const response = new Response('page', { status: 503, headers: { 'retry-after': '30' } })
  const handler: WorkerFetchHandler<SentryWorkerEnvironment> = {
    fetch: jest.fn(async () => response)
  }
  return { handler, response }
}

describe('withSentryWhenEnabled', () => {
  it('sends every request straight to the handler while Sentry is off', async () => {
    const { handler, response } = plainHandler()
    const reporting = { fetch: jest.fn() }
    const worker = withSentryWhenEnabled(handler, '0.1.0+abc', () => reporting)

    for (const env of [
      { SITE_ENVIRONMENT: 'production' },
      { SITE_ENVIRONMENT: 'staging', SENTRY_DSN: '' },
      { SITE_ENVIRONMENT: 'local', SENTRY_DSN: DSN },
      { SENTRY_DSN: DSN }
    ]) {
      const request = new Request('https://boxingundefeated.com/')
      // The very response the handler returned: status, headers and body untouched.
      await expect(worker.fetch(request, env, ctx)).resolves.toBe(response)
      expect(handler.fetch).toHaveBeenLastCalledWith(request, env, ctx)
    }
    expect(reporting.fetch).not.toHaveBeenCalled()
  })

  it('sends requests through the Sentry wrapper in staging and production with a DSN', async () => {
    const { handler } = plainHandler()
    const wrapped = new Response('wrapped')
    const reporting = { fetch: jest.fn(async () => wrapped) }
    const wrap = jest.fn(() => reporting)
    const worker = withSentryWhenEnabled(handler, '0.1.0+abc', wrap)

    const env = { SITE_ENVIRONMENT: 'staging', SENTRY_DSN: DSN }
    const request = new Request('https://staging.boxingundefeated.com/')
    await expect(worker.fetch(request, env, ctx)).resolves.toBe(wrapped)
    expect(reporting.fetch).toHaveBeenCalledWith(request, env, ctx)
    expect(wrap).toHaveBeenCalledWith(handler, '0.1.0+abc')
  })

  it('serves without Sentry when wrapping fails', async () => {
    const { handler, response } = plainHandler()
    const worker = withSentryWhenEnabled(handler, undefined, () => {
      throw new Error('Sentry failed to start')
    })
    const env = { SITE_ENVIRONMENT: 'production', SENTRY_DSN: DSN }
    await expect(
      worker.fetch(new Request('https://boxingundefeated.com/'), env, ctx)
    ).resolves.toBe(response)
  })

  it('wraps with the real SDK without calling the handler or sending anything', () => {
    const { handler } = plainHandler()
    const worker = withSentryWhenEnabled(handler, '0.1.0+abc')
    expect(typeof worker.fetch).toBe('function')
    expect(handler.fetch).not.toHaveBeenCalled()
  })
})

describe('withKnownLength', () => {
  it('gives a text/plain body without a length its length, and keeps the rest', async () => {
    const response = new Response('User-agent: *\nDisallow: /\n', {
      status: 503,
      headers: {
        'content-type': 'text/plain; charset=utf-8',
        'cache-control': 'no-store',
        'x-robots-tag': 'noindex'
      }
    })
    const sized = await withKnownLength(response)
    expect(sized.status).toBe(503)
    expect(Object.fromEntries(sized.headers)).toEqual({
      'content-type': 'text/plain; charset=utf-8',
      'cache-control': 'no-store',
      'x-robots-tag': 'noindex',
      'content-length': '26'
    })
    await expect(sized.text()).resolves.toBe('User-agent: *\nDisallow: /\n')
  })

  it('leaves every other response as it is', async () => {
    const responses = [
      new Response('<html></html>', { headers: { 'content-type': 'text/html' } }),
      new Response('ok', { headers: { 'content-type': 'text/plain', 'content-length': '2' } }),
      new Response(null, { status: 404, headers: { 'content-type': 'text/plain' } }),
      new Response('{}', { headers: { 'content-type': 'application/json' } })
    ]
    for (const response of responses) {
      await expect(withKnownLength(response)).resolves.toBe(response)
    }
  })
})
