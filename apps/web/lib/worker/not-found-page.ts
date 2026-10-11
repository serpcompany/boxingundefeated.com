/**
 * The full not-found page for a D1 page that calls `notFound()`: an unknown boxer, division or
 * page number. Step 6 of lib/worker/handle-request.ts, inside the edge cache's render.
 *
 * Next.js 16 can only send a 404 status for a page rendered on request by failing the HTML shell,
 * so OpenNext answers `notFound()` with an empty `<html id="__next_error__">` document that the
 * browser fills in from the RSC payload: crawlers that don't run JavaScript, and the first paint,
 * get no content. The prerendered `/_not-found` page is the same not-found UI as a complete
 * document, the one Next.js already serves for unmatched URLs, so the Worker sends its body
 * instead, with the 404 and the headers of the page's own answer (`no-store`, `Vary`). It costs no
 * D1 query, and the page's `noindex` meta tag comes with it.
 *
 * Only that empty document is replaced. Everything else passes through as it is: any other status,
 * a 404 that already has a body, anything but HTML, a `HEAD` (no body to tell the two apart; its
 * headers are the same as the `GET`'s), and a client-side navigation or prefetch (`rsc` header),
 * whose RSC payload the browser renders as the not-found page already. A 404 is never stored in the
 * edge cache (lib/worker/edge-cache.ts), so neither is this page.
 */

export const NOT_FOUND_PATH = '/_not-found'

const HTML_CONTENT_TYPE = /^text\/html\b/iu
/** The root element of Next.js's empty error document (`ErrorApp` in app-render). */
const ERROR_SHELL = /<html\b[^>]*\bid="__next_error__"/u

function isHtml(response: Response): boolean {
  return HTML_CONTENT_TYPE.test(response.headers.get('content-type') ?? '')
}

/**
 * `render` answers a D1 page; when that answer is the empty not-found document, the prerendered
 * not-found page from `render` replaces its body.
 */
export async function withNotFoundPage(
  request: Request,
  render: (request: Request) => Promise<Response>
): Promise<Response> {
  const response = await render(request)
  if (response.status !== 404 || request.method !== 'GET' || request.headers.has('rsc')) {
    return response
  }
  if (!isHtml(response)) return response

  const html = await response.text()
  if (!ERROR_SHELL.test(html)) return new Response(html, response)

  const url = new URL(request.url)
  url.pathname = NOT_FOUND_PATH
  url.search = ''
  let page: Response
  try {
    page = await render(new Request(url, { headers: request.headers }))
  } catch {
    // The enhancement failed, not the request: it is still a 404, with the document it had.
    return new Response(html, response)
  }
  if (page.status !== 404 || !isHtml(page)) {
    void page.body?.cancel().catch(() => undefined)
    return new Response(html, response)
  }
  const headers = new Headers(response.headers)
  headers.delete('content-length')
  headers.set('content-type', page.headers.get('content-type') ?? 'text/html; charset=utf-8')
  return new Response(page.body, { status: 404, statusText: 'Not Found', headers })
}
