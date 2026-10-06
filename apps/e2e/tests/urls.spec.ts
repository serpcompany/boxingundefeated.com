import { type APIRequestContext, expect, test } from '@playwright/test'
import { boxer, target } from './site'

/**
 * The URL trailing-slash standard (serpcompany/serp docs/engineering/standards/
 * url-trailing-slash.md, "Verification"): pages end with a slash, files never do, one 308 gets
 * there on the same host, and /api is never redirected.
 */

/** `from` answers one 308 to `to` on the same host, and `to` answers 200. */
async function expectOneHop(request: APIRequestContext, from: string, to: string) {
  const response = await request.get(from, { maxRedirects: 0 })
  expect(response.status(), from).toBe(308)
  const location = new URL(response.headers().location ?? '', target.baseUrl)
  expect(location.origin, `${from} stays on the host`).toBe(target.baseUrl)
  expect(`${location.pathname}${location.search}`, `${from} Location`).toBe(to)
  const destination = await request.get(to, { maxRedirects: 0 })
  expect(destination.status(), to).toBe(200)
}

function isRedirect(status: number): boolean {
  return status >= 300 && status < 400
}

test('a page without its slash answers 308 to the slashed page', async ({ request }) => {
  const pages = ['/about/', '/boxers/', boxer.path, '/divisions/heavy/', '/shop/best/kettlebells/']
  for (const page of pages) {
    await expectOneHop(request, page.slice(0, -1), page)
  }
  // The query string is kept.
  await expectOneHop(request, '/search?q=ortiz', '/search/?q=ortiz')
})

test('a file with a slash answers 308 to the file', async ({ request }) => {
  await expectOneHop(request, '/robots.txt/', '/robots.txt')
  await expectOneHop(request, '/ads.txt/', '/ads.txt')
})

test('/api/search is never redirected, with or without a slash', async ({ request }) => {
  for (const path of [
    '/api/search',
    '/api/search/',
    '/api/search?q=ortiz',
    '/api/search/?q=ortiz'
  ]) {
    const response = await request.get(path, { maxRedirects: 0 })
    expect(isRedirect(response.status()), `${path} answered ${response.status()}`).toBe(false)
  }
})

// Pending #36, which adds the endpoint (issue #12). Until it merges, /api/search is a 404, which
// the test above already holds to "never 3xx". Remove the fixme when #36 is on main.
test.fixme('/api/search answers 200 with matching boxers (#36)', async ({ request }) => {
  for (const path of ['/api/search?q=ortiz', '/api/search/?q=ortiz']) {
    const response = await request.get(path, { maxRedirects: 0 })
    expect(response.status(), path).toBe(200)
    expect(response.headers()['content-type']).toContain('application/json')
    const body = (await response.json()) as { results: Array<{ slug: string }> }
    expect(body.results.map(result => result.slug)).toContain('manuel-ortiz')
  }
})
