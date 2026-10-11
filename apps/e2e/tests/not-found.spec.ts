import { expect, type Page, test } from '@playwright/test'
import { isNoindex, pageFacts } from '../src/html'
import { target } from './site'

/**
 * Pages that render from D1 answer an unknown boxer, division or page number with a 404 whose
 * first HTML is the full not-found page, noindex, never from the edge cache
 * (apps/web/lib/worker/not-found-page.ts). Next.js alone would send an empty error document that
 * only JavaScript fills in. An unmatched URL gets the same page from Next.js itself.
 */
const NOT_FOUND_H1 = 'Page Not Found'
const unknownD1Pages = [
  '/boxers/no-such-boxer-e2e/',
  '/boxers/page/99999/',
  '/divisions/no-such-division-e2e/',
  '/divisions/heavy/page/99999/'
]

/** Keep the browser on the site under test. */
async function sameOriginOnly(page: Page) {
  await page.route(
    url => url.origin !== target.baseUrl,
    route => route.abort()
  )
}

for (const path of [...unknownD1Pages, '/no-such-page-e2e/']) {
  test(`${path} answers 404 with the not-found page in its first HTML`, async ({ request }) => {
    for (const attempt of ['first', 'repeat']) {
      const response = await request.get(path, { maxRedirects: 0 })
      expect(response.status(), `${attempt} status`).toBe(404)
      expect(response.headers()['content-type']).toContain('text/html')
      expect(response.headers()['x-edge-cache'], `${attempt}: never stored`).not.toBe('HIT')

      const html = await response.text()
      const facts = pageFacts(html)
      expect(facts.h1, `${attempt} <h1>`).toBe(NOT_FOUND_H1)
      expect(html).not.toContain('id="__next_error__"')
      expect(isNoindex(facts.robots), `<meta name="robots" content="${facts.robots}">`).toBe(true)
    }
  })
}

test.describe('in a browser', () => {
  test.beforeEach(async ({ page }) => sameOriginOnly(page))
  const [unknownBoxer] = unknownD1Pages as [string]

  test('the not-found page of an unknown boxer hydrates and links home', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', error => errors.push(String(error)))

    const response = await page.goto(unknownBoxer)
    expect(response?.status()).toBe(404)
    await expect(page.getByRole('heading', { level: 1, name: NOT_FOUND_H1 })).toBeVisible()

    await page.getByRole('link', { name: 'Back to homepage' }).click()
    await expect(page.getByRole('heading', { level: 1, name: 'Boxing Undefeated' })).toBeVisible()
    expect(new URL(page.url()).pathname).toBe('/')
    expect(errors).toEqual([])
  })

  test('a client-side navigation to an unknown boxer shows the not-found page', async ({
    page
  }) => {
    await page.goto('/')
    await expect(page.getByRole('heading', { level: 1, name: 'Boxing Undefeated' })).toBeVisible()
    const documents: string[] = []
    page.on('request', request => {
      if (request.resourceType() === 'document') documents.push(request.url())
    })

    // The App Router instance Next.js exposes on `window.next` (no link points to a missing boxer).
    await page.evaluate(path => {
      const next = (window as { next?: { router?: { push(href: string): void } } }).next
      if (!next?.router) throw new Error('window.next.router is missing')
      next.router.push(path)
    }, unknownBoxer)

    await expect(page.getByRole('heading', { level: 1, name: NOT_FOUND_H1 })).toBeVisible()
    expect(new URL(page.url()).pathname).toBe(unknownBoxer)
    expect(documents, 'no full page load').toEqual([])
  })
})
