/**
 * @jest-environment node
 */
import { withNotFoundPage } from './not-found-page'

const HTML = 'text/html; charset=utf-8'
const NO_STORE = 'private, no-cache, no-store, max-age=0, must-revalidate'
const VARY = 'rsc, next-router-state-tree, next-router-prefetch, next-router-segment-prefetch'
/** What OpenNext answers for `notFound()` in a page rendered on request (abridged). */
const ERROR_SHELL =
  '<!DOCTYPE html><html id="__next_error__"><head><meta name="robots" content="noindex"/></head>' +
  '<body><div hidden=""><!--$--><!--/$--></div><script>self.__next_f.push([1,"..."])</script></body></html>'
/** The prerendered `/_not-found` page (abridged). */
const NOT_FOUND_PAGE =
  '<!DOCTYPE html><html lang="en"><head><meta name="robots" content="noindex"/></head>' +
  '<body><main><h1>Page Not Found</h1></main></body></html>'

function shell(init: ResponseInit = {}) {
  return new Response(ERROR_SHELL, {
    status: 404,
    headers: {
      'content-type': HTML,
      'cache-control': NO_STORE,
      vary: VARY,
      'content-length': '999'
    },
    ...init
  })
}

/** OpenNext: `page` for the page requested, the prerendered not-found page for `/_not-found`. */
function openNext(page: () => Response = shell, notFound?: () => Response) {
  return jest.fn(async (request: Request) =>
    new URL(request.url).pathname === '/_not-found'
      ? (notFound?.() ??
        new Response(NOT_FOUND_PAGE, { status: 404, headers: { 'content-type': HTML } }))
      : page()
  )
}

const UNKNOWN_BOXER = 'https://boxingundefeated.com/boxers/no-such-boxer/'

describe('withNotFoundPage', () => {
  it("answers notFound()'s empty document with the not-found page, a 404 with the page's headers", async () => {
    const serve = openNext()
    const response = await withNotFoundPage(
      new Request(`${UNKNOWN_BOXER}?utm_source=x`, { headers: { accept: 'text/html' } }),
      serve
    )

    expect(response.status).toBe(404)
    expect(await response.text()).toBe(NOT_FOUND_PAGE)
    expect(response.headers.get('content-type')).toBe(HTML)
    expect(response.headers.get('cache-control')).toBe(NO_STORE)
    expect(response.headers.get('vary')).toBe(VARY)
    expect(response.headers.get('content-length')).toBeNull()

    expect(serve).toHaveBeenCalledTimes(2)
    const notFound = serve.mock.calls[1]?.[0] as Request
    expect(notFound.url).toBe('https://boxingundefeated.com/_not-found')
    expect(notFound.method).toBe('GET')
    expect(notFound.headers.get('accept')).toBe('text/html')
  })

  it('passes a page, a redirect and an error through', async () => {
    for (const status of [200, 308, 500, 503]) {
      const serve = openNext(
        () => new Response('answer', { status, headers: { 'content-type': HTML } })
      )
      const response = await withNotFoundPage(new Request(UNKNOWN_BOXER), serve)

      expect(response.status).toBe(status)
      expect(await response.text()).toBe('answer')
      expect(serve).toHaveBeenCalledTimes(1)
    }
  })

  it('keeps a 404 that already has a full body, headers and all', async () => {
    const serve = openNext(
      () =>
        new Response(NOT_FOUND_PAGE, {
          status: 404,
          headers: { 'content-type': HTML, etag: '"page"' }
        })
    )
    const response = await withNotFoundPage(new Request(UNKNOWN_BOXER), serve)

    expect(response.status).toBe(404)
    expect(await response.text()).toBe(NOT_FOUND_PAGE)
    expect(response.headers.get('etag')).toBe('"page"')
    expect(serve).toHaveBeenCalledTimes(1)
  })

  it('leaves a 404 that is not HTML alone', async () => {
    for (const type of ['text/x-component', 'application/json', 'text/plain']) {
      const answer = new Response('{}', { status: 404, headers: { 'content-type': type } })
      const serve = openNext(() => answer)
      const response = await withNotFoundPage(new Request(UNKNOWN_BOXER), serve)

      expect(response).toBe(answer)
      expect(serve).toHaveBeenCalledTimes(1)
    }
  })

  it("leaves a client-side navigation's and a prefetch's RSC answer alone", async () => {
    for (const headers of [
      { rsc: '1' },
      { rsc: '1', 'next-router-prefetch': '1' },
      { rsc: '1', 'next-router-segment-prefetch': '/_tree' }
    ]) {
      // Even an HTML 404, which a real RSC request doesn't get.
      const serve = openNext()
      const response = await withNotFoundPage(new Request(UNKNOWN_BOXER, { headers }), serve)

      expect(response.status).toBe(404)
      expect(await response.text()).toBe(ERROR_SHELL)
      expect(serve).toHaveBeenCalledTimes(1)
    }
  })

  it("answers HEAD with OpenNext's own 404 and headers, without rendering the not-found page", async () => {
    const answer = shell({ headers: { 'content-type': HTML, 'cache-control': NO_STORE } })
    const serve = openNext(() => new Response(null, answer))
    const response = await withNotFoundPage(new Request(UNKNOWN_BOXER, { method: 'HEAD' }), serve)

    expect(response.status).toBe(404)
    expect(response.headers.get('content-type')).toBe(HTML)
    expect(response.headers.get('cache-control')).toBe(NO_STORE)
    expect(await response.text()).toBe('')
    expect(serve).toHaveBeenCalledTimes(1)
  })

  it('keeps the empty document when the not-found page is unavailable', async () => {
    for (const notFound of [
      () => new Response('oops', { status: 500, headers: { 'content-type': HTML } }),
      () => new Response(null, { status: 308, headers: { location: '/_not-found/' } }),
      () => new Response('{}', { status: 404, headers: { 'content-type': 'application/json' } })
    ]) {
      const serve = openNext(shell, notFound)
      const response = await withNotFoundPage(new Request(UNKNOWN_BOXER), serve)

      expect(response.status).toBe(404)
      expect(await response.text()).toBe(ERROR_SHELL)
      expect(response.headers.get('cache-control')).toBe(NO_STORE)
      expect(serve).toHaveBeenCalledTimes(2)
    }
  })

  it('keeps the empty 404 when rendering the not-found page throws', async () => {
    const serve = jest.fn(async (request: Request) => {
      if (new URL(request.url).pathname === '/_not-found') throw new Error('render failed')
      return shell()
    })
    const response = await withNotFoundPage(new Request(UNKNOWN_BOXER), serve)

    expect(response.status).toBe(404)
    expect(await response.text()).toBe(ERROR_SHELL)
    expect(response.headers.get('content-type')).toBe(HTML)
    expect(response.headers.get('cache-control')).toBe(NO_STORE)
    expect(response.headers.get('vary')).toBe(VARY)
    expect(serve).toHaveBeenCalledTimes(2)
  })
})
