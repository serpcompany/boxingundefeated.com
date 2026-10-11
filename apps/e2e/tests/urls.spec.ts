import { type APIRequestContext, expect, test } from '@playwright/test'
import { boxer, target } from './site'

/**
 * The URL trailing-slash standard (serpcompany/serp docs/engineering/standards/
 * url-trailing-slash.md, "Verification"): pages end with a slash, files never do, one 308 gets
 * there on the same host, and /api is never redirected.
 */

/**
 * `from` answers one 308 to `to` on the same host, and `to` answers `status`: 200, or 404 for a
 * path no page has.
 */
async function expectOneHop(request: APIRequestContext, from: string, to: string, status = 200) {
  const response = await request.get(from, { maxRedirects: 0 })
  expect(response.status(), from).toBe(308)
  const location = new URL(response.headers().location ?? '', target.baseUrl)
  expect(location.origin, `${from} stays on the host`).toBe(target.baseUrl)
  expect(`${location.pathname}${location.search}`, `${from} Location`).toBe(to)
  const destination = await request.get(to, { maxRedirects: 0 })
  expect(destination.status(), to).toBe(status)
}

test('a page without its slash answers 308 to the slashed page', async ({ request }) => {
  for (const page of ['/about/', '/boxers/', boxer.path, '/divisions/heavy/']) {
    await expectOneHop(request, page.slice(0, -1), page)
  }
  // The query string is kept.
  await expectOneHop(request, '/search?q=ortiz', '/search/?q=ortiz')
  // A dotted segment is still a page, not a file (the standard's dotted case). No page has a
  // dotted slug since the shop's were retired (#94), so the slashed path is a 404.
  await expectOneHop(request, '/boxers/2.7-l', '/boxers/2.7-l/', 404)
})

test('a file with a slash answers 308 to the file', async ({ request }) => {
  await expectOneHop(request, '/robots.txt/', '/robots.txt')
  await expectOneHop(request, '/ads.txt/', '/ads.txt')
})

test('/api/search answers 200 with matching boxers, with or without a slash', async ({
  request
}) => {
  // Served exactly as requested: never a redirect, and a real answer (not a 404 or 5xx).
  for (const path of ['/api/search?q=ortiz', '/api/search/?q=ortiz']) {
    const response = await request.get(path, { maxRedirects: 0 })
    expect(response.status(), path).toBe(200)
    expect(response.headers()['content-type'], path).toContain('application/json')
    const body = (await response.json()) as { results: Array<{ slug: string }> }
    expect(
      body.results.map(result => result.slug),
      path
    ).toContain('manuel-ortiz')
  }
})
