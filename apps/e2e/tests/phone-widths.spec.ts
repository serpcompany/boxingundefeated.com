import { expect, type Page, test } from '@playwright/test'
import { samplePages, target } from './site'

/**
 * No page scrolls sideways on a phone (#75). A boxer profile was 469 px wide on a 390 px screen:
 * the name and a long nickname beside the photo. `/boxers/matthew-bowling/` is that profile, and
 * it is in the committed D1 fixture, so the seeded local D1 serves it as well as a full import.
 */
const PHONE_WIDTHS = [390, 360]

const pages = [
  ...samplePages.map(({ path }) => path),
  '/boxers/matthew-bowling/',
  '/divisions/',
  '/sitemap/',
  '/about/',
  '/privacy/',
  '/terms/',
  '/no-such-page-e2e/'
]

/** Keep the browser on the site under test. */
async function sameOriginOnly(page: Page) {
  await page.route(
    url => url.origin !== target.baseUrl,
    route => route.abort()
  )
}

/** The page's width, and the outermost elements that stick out past the right edge. */
function measureOverflow() {
  const viewport = window.innerWidth
  const sticksOut = (element: Element | null) =>
    !!element && element.getBoundingClientRect().right > viewport + 0.5
  const culprits = [...document.body.querySelectorAll('*')]
    .filter(element => sticksOut(element) && !sticksOut(element.parentElement))
    .map(element => {
      const text = (element.textContent ?? '').replace(/\s+/g, ' ').trim().slice(0, 60)
      return `<${element.tagName.toLowerCase()} class="${element.getAttribute('class') ?? ''}"> "${text}"`
    })
  return { viewport, scrollWidth: document.documentElement.scrollWidth, culprits }
}

test.describe('at phone widths', () => {
  test.beforeEach(async ({ page }) => sameOriginOnly(page))

  for (const path of pages) {
    test(`${path} doesn't scroll sideways`, async ({ page }) => {
      await page.setViewportSize({ width: PHONE_WIDTHS[0], height: 800 })
      await page.goto(path)
      // "Show more" on a fight history, and any other disclosure: measure what a visitor can open.
      await page.evaluate(() => {
        for (const details of document.querySelectorAll('details')) details.open = true
      })

      for (const width of PHONE_WIDTHS) {
        await page.setViewportSize({ width, height: 800 })
        const { viewport, scrollWidth, culprits } = await page.evaluate(measureOverflow)
        expect(scrollWidth, `${path} at ${width} px: ${culprits.join(', ')}`).toBeLessThanOrEqual(
          viewport
        )
      }
    })
  }
})
