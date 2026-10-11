import type { Page } from '@playwright/test'
import { pageFacts } from '../src/html'
import {
  boxer,
  boxerTitleLimitSamples,
  canonicalUrl,
  expect,
  samplePages,
  sampleTitles,
  target,
  test
} from './site'

/**
 * Keep the browser on the site under test: no analytics hits from test runs, and no
 * dependency on third-party hosts.
 */
async function sameOriginOnly(page: Page) {
  await page.route(
    url => url.origin !== target.baseUrl,
    route => route.abort()
  )
}

test.describe('canonical pages', () => {
  for (const sample of samplePages) {
    test(`${sample.name} ${sample.path} answers 200 at its canonical URL`, async ({ request }) => {
      const response = await request.get(sample.path, { maxRedirects: 0 })
      expect(response.status(), sample.path).toBe(200)
      expect(response.headers()['content-type']).toContain('text/html')

      const facts = pageFacts(await response.text())
      expect(facts.canonicalCount, 'one canonical').toBe(1)
      expect(facts.canonical).toBe(canonicalUrl(sample.path))
      expect(facts.h1).toBe(sample.h1)
      const title = sampleTitles[sample.path]
      if (title) {
        expect(facts.title).toBe(title)
        // A share shows the page's own title, not the site name the root layout sets.
        expect(facts.ogTitle, 'og:title').toBe(title)
        expect(facts.twitterTitle, 'twitter:title').toBe(title)
        if (sample.path !== '/') expect(facts.ogUrl, 'og:url').toBe(facts.canonical)
      }
    })
  }

  for (const { path, title } of boxerTitleLimitSamples) {
    test(`${path} is titled "${title}"`, async ({ request }) => {
      const response = await request.get(path, { maxRedirects: 0 })
      expect(response.status(), path).toBe(200)

      const facts = pageFacts(await response.text())
      expect(facts.title).toBe(title)
      expect(facts.ogTitle, 'og:title').toBe(title)
      expect(facts.twitterTitle, 'twitter:title').toBe(title)
    })
  }

  test('files answer 200 without a slash', async ({ request }) => {
    for (const path of ['/robots.txt', '/ads.txt']) {
      const response = await request.get(path, { maxRedirects: 0 })
      expect(response.status(), path).toBe(200)
      expect(response.headers()['content-type'], path).toContain('text/plain')
    }
  })

  test('the homepage canonical and og:url are the origin without a slash', async ({ request }) => {
    const facts = pageFacts(await (await request.get('/', { maxRedirects: 0 })).text())
    expect(facts.canonical).toBe(target.canonicalOrigin)
    expect(facts.ogUrl).toBe(target.canonicalOrigin)
    expect(target.canonicalOrigin.endsWith('/')).toBe(false)
  })
})

test.describe('in a browser', () => {
  test.beforeEach(async ({ page }) => sameOriginOnly(page))

  test('the homepage renders', async ({ page }) => {
    const response = await page.goto('/')
    expect(response?.status()).toBe(200)
    await expect(page.getByRole('heading', { level: 1, name: 'Boxing Undefeated' })).toBeVisible()
  })

  test('search finds a boxer and links to the profile', async ({ page }) => {
    await page.goto('/search/')
    await page.locator('main input').first().fill(boxer.h1)
    await expect(page.locator(`main a[href="${boxer.path}"]`).first()).toBeVisible()
  })
})
