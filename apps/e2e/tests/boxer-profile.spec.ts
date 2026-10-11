import { gzipSync } from 'node:zlib'
import type { Page } from '@playwright/test'
import { boxer, expect, target, test } from './site'

/**
 * A boxer profile's fight history (#80, apps/web/components/fight-history.tsx): every bout is in
 * the first HTML, one list item each; the first 10 show, and "Show N more fights" (a native
 * `<details>`) reveals the rest without JavaScript. The sample boxer has 100 bouts, the pipeline's
 * cap, so the page is also the largest a profile gets from its bouts.
 */

/** The profile's weight for a 100-bout record: 150 KB of HTML, 25 KB gzipped. */
const HTML_BUDGET_BYTES = 150_000
const GZIP_BUDGET_BYTES = 25_000
const INITIAL_BOUTS = 10

/** Keep the browser on the site under test. */
async function sameOriginOnly(page: Page) {
  await page.route(
    url => url.origin !== target.baseUrl,
    route => route.abort()
  )
}

function fightHistory(page: Page) {
  return page
    .locator('[data-slot="card"]')
    .filter({ has: page.getByText(/^Fight History \(\d+ Bouts\)$/) })
}

/** N from the card's "Fight History (N Bouts)". */
async function boutCount(page: Page): Promise<number> {
  const title = await fightHistory(page)
    .getByText(/^Fight History \(\d+ Bouts\)$/)
    .textContent()
  return Number(/\((\d+) Bouts\)/.exec(title ?? '')?.[1])
}

test.describe('the fight history, without JavaScript', () => {
  // The DOM is then the first HTML as the server sent it, as a crawler that doesn't run scripts
  // reads it.
  test.use({ javaScriptEnabled: false })
  test.beforeEach(async ({ page }) => sameOriginOnly(page))

  test(`${boxer.path} has every bout in the first HTML, 10 of them shown`, async ({ page }) => {
    const response = await page.goto(boxer.path)
    expect(response?.status()).toBe(200)

    const bouts = await boutCount(page)
    expect(bouts, 'the sample boxer has more bouts than are shown').toBeGreaterThan(INITIAL_BOUTS)
    const items = fightHistory(page).getByRole('listitem')
    await expect(fightHistory(page).getByRole('listitem', { includeHidden: true })).toHaveCount(
      bouts
    )
    await expect(items).toHaveCount(INITIAL_BOUTS)
  })

  test('"Show more" reveals the rest without JavaScript', async ({ page }) => {
    await page.goto(boxer.path)
    const bouts = await boutCount(page)
    const showMore = fightHistory(page).getByText(`Show ${bouts - INITIAL_BOUTS} more fights`)

    await showMore.click()
    await expect(fightHistory(page).getByRole('listitem')).toHaveCount(bouts)
    await expect(showMore).toBeHidden()
  })
})

test(`${boxer.path} stays within its weight budget`, async ({ request }) => {
  const response = await request.get(boxer.path, { maxRedirects: 0 })
  expect(response.status()).toBe(200)
  const html = await response.body()

  expect(html.length, 'HTML bytes').toBeLessThanOrEqual(HTML_BUDGET_BYTES)
  expect(gzipSync(html).length, 'gzipped HTML bytes').toBeLessThanOrEqual(GZIP_BUDGET_BYTES)
})
