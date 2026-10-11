import type { APIRequestContext, PlaywrightWorkerArgs } from '@playwright/test'
import { isNoindex, pageFacts, robotsGroups } from '../src/html'
import { isPlatformHost, SMOKE_TEST_HEADER } from '../src/target'
import {
  boxer,
  canonicalUrl,
  expect,
  stagingAuthorization,
  target,
  test,
  watchBrowserErrors
} from './site'

/**
 * Staging's password (serpcompany/serp docs/engineering/standards/staging-access.md,
 * "Verification"; apps/web/lib/worker/staging-access.ts). Without it, staging answers 401 on every
 * host, except smoke-test requests and `/robots.txt`, which keep their noindex. With it, staging
 * is indexable and canonical on its own host. Production and local never ask for it.
 *
 * On a `*.workers.dev` target (the deploy smoke) a request that passes the password gets the
 * canonical-host 308 to staging.boxingundefeated.com, which CI can't reach (#45), so the tests
 * that need staging's pages run against the custom domain or a local `--env staging` preview.
 */
const CHALLENGE = 'Basic realm="boxingundefeated.com staging", charset="UTF-8"'
const onPlatformHost = isPlatformHost(new URL(target.baseUrl).hostname)

const pages = ['/', boxer.path, '/boxers/', '/divisions/heavy/', '/about/']
const files = ['/sitemap-index.xml', '/sitemap-boxers.xml', '/ads.txt', '/api/search?q=ortiz']
/** Redirects, a 404 and 410s: none of them is answered before the password either. */
const others = [
  '/about',
  '/robots.txt/',
  '/sitemap.xml',
  '/not-a-page/',
  '/blog',
  '/shop/best/1-inch-thick-yoga-mats/',
  '/sitemap-shop.xml'
]

/** A request context without the suite's default smoke-test header. */
async function withContext<T>(
  playwright: PlaywrightWorkerArgs['playwright'],
  headers: Record<string, string>,
  run: (context: APIRequestContext) => Promise<T>
): Promise<T> {
  const context = await playwright.request.newContext({
    baseURL: target.baseUrl,
    extraHTTPHeaders: headers
  })
  try {
    return await run(context)
  } finally {
    await context.dispose()
  }
}

test.describe("staging's password", () => {
  test.skip(target.environment !== 'staging', `EXPECT_ENV=${target.environment} has no password`)

  test('every page and file answers 401 without it, with a Basic challenge', async ({
    playwright
  }) => {
    for (const headers of [{}, { authorization: stagingAuthorization('wrong') }] as Record<
      string,
      string
    >[]) {
      await withContext(playwright, headers, async context => {
        for (const path of [...pages, ...files, ...others]) {
          // After a deploy, the new version can take a few seconds to reach every edge.
          await expect(async () => {
            const response = await context.get(path, { maxRedirects: 0 })
            expect(response.status(), path).toBe(401)
            expect(response.headers()['www-authenticate'], path).toBe(CHALLENGE)
            expect(response.headers()['cache-control'], path).toBe('no-store')
            expect(isNoindex(response.headers()['x-robots-tag']), path).toBe(true)
            expect(response.headers()['x-edge-cache'], path).toBeUndefined()
            expect(await response.text(), path).not.toContain('<html')
          }).toPass({ timeout: 30_000, intervals: [1_000, 2_000, 5_000] })
        }
      })
    }
  })

  test('robots.txt is served without it, and disallows every crawler but the auditor', async ({
    playwright
  }) => {
    await withContext(playwright, {}, async context => {
      const response = await context.get('/robots.txt', { maxRedirects: 0 })
      if (onPlatformHost) {
        // Not refused: the canonical-host redirect sends it on to staging's own robots.txt.
        expect(response.status()).toBe(308)
        expect(response.headers().location).toBe(`${target.canonicalOrigin}/robots.txt`)
        return
      }
      expect(response.status()).toBe(200)
      expect(response.headers()['www-authenticate']).toBeUndefined()
      expect(isNoindex(response.headers()['x-robots-tag'])).toBe(true)
      const text = await response.text()
      expect(robotsGroups(text).get('*')).toEqual(['disallow: /'])
      expect(robotsGroups(text).get('ahrefssiteaudit')).toEqual(['allow: /'])
      expect(text).toContain(`Sitemap: ${target.canonicalOrigin}/sitemap-index.xml`)
    })
  })

  test('smoke-test requests pass without it and keep noindex, with it too', async ({
    playwright
  }) => {
    const password = { authorization: stagingAuthorization() }
    for (const headers of [
      { [SMOKE_TEST_HEADER]: '1' },
      { [SMOKE_TEST_HEADER]: '1', ...password }
    ]) {
      await withContext(playwright, headers, async context => {
        for (const path of pages) {
          const response = await context.get(path, { maxRedirects: 0 })
          expect(response.status(), path).toBe(200)
          expect(isNoindex(response.headers()['x-robots-tag']), path).toBe(true)
          expect(pageFacts(await response.text()).canonical, path).toBe(canonicalUrl(path))
        }
      })
    }
  })

  test('the password passes, with any username', async ({ playwright }) => {
    for (const username of ['staging', '', 'AhrefsSiteAudit']) {
      await withContext(
        playwright,
        { authorization: stagingAuthorization(undefined, username) },
        async context => {
          for (const path of pages) {
            const response = await context.get(path, { maxRedirects: 0 })
            expect(response.headers()['www-authenticate'], path).toBeUndefined()
            if (onPlatformHost) {
              // Past the gate, workers.dev sends it on to staging's own host.
              expect(response.status(), path).toBe(308)
              expect(response.headers().location, path).toBe(`${target.canonicalOrigin}${path}`)
              continue
            }
            expect(response.status(), path).toBe(200)
            expect(response.headers()['x-robots-tag'], path).toBeUndefined()
            const facts = pageFacts(await response.text())
            expect(facts.canonical, path).toBe(canonicalUrl(path))
            expect(isNoindex(facts.robots), path).toBe(false)
          }
        }
      )
    }
  })

  test.describe('behind the password', () => {
    test.skip(
      onPlatformHost,
      'workers.dev sends a request with the password on to the custom domain'
    )

    test('sitemaps, files and the search API are indexable as in production', async ({
      playwright
    }) => {
      await withContext(playwright, { authorization: stagingAuthorization() }, async context => {
        const index = await context.get('/sitemap-index.xml')
        expect(index.status()).toBe(200)
        expect(index.headers()['x-robots-tag']).toBeUndefined()
        const xml = await index.text()
        expect(xml).toContain(`<loc>${target.canonicalOrigin}/sitemap-boxers.xml</loc>`)
        expect(xml).not.toContain('https://boxingundefeated.com')

        const ads = await context.get('/ads.txt')
        expect(ads.status()).toBe(200)
        expect(ads.headers()['x-robots-tag']).toBeUndefined()

        // The search API keeps its own noindex, as in production.
        const search = await context.get('/api/search?q=ortiz')
        expect(search.status()).toBe(200)
        expect(isNoindex(search.headers()['x-robots-tag'])).toBe(true)
      })
    })

    test('the edge cache never serves a stored page across the password', async ({
      playwright
    }) => {
      const path = `/divisions/heavy/?staging-cache-check=${Date.now()}`
      await withContext(playwright, {}, async anonymous => {
        await withContext(
          playwright,
          { authorization: stagingAuthorization() },
          async authorized => {
            expect((await anonymous.get(path)).status()).toBe(401)
            const first = await authorized.get(path)
            expect(first.status()).toBe(200)
            expect(first.headers()['x-edge-cache']).toBe('MISS')
            await expect(async () => {
              const repeat = await authorized.get(path)
              expect(repeat.headers()['x-edge-cache']).toBe('HIT')
              expect(repeat.headers()['x-robots-tag']).toBeUndefined()
            }).toPass({ timeout: 10_000 })

            // Stored for a request with the password: still 401 without it, noindex for CI.
            const after = await anonymous.get(path)
            expect(after.status()).toBe(401)
            expect(await after.text()).not.toContain('<html')
            const smoke = await anonymous.get(path, { headers: { [SMOKE_TEST_HEADER]: '1' } })
            expect(smoke.headers()['x-edge-cache']).toBe('HIT')
            expect(isNoindex(smoke.headers()['x-robots-tag'])).toBe(true)
          }
        )
      })
    })

    test('a browser is asked for the password, then gets the site', async ({ browser }) => {
      const refused = await browser.newContext({ extraHTTPHeaders: {} })
      const refusedErrors = watchBrowserErrors(refused, [401])
      try {
        const response = await (await refused.newPage()).goto(`${target.baseUrl}/`)
        expect(response?.status()).toBe(401)
      } finally {
        await refused.close()
      }
      expect(refusedErrors, 'console errors and uncaught errors in the browser').toEqual([])

      const signedIn = await browser.newContext({
        extraHTTPHeaders: {},
        httpCredentials: { username: 'staging', password: target.stagingPassword }
      })
      const signedInErrors = watchBrowserErrors(signedIn)
      try {
        const page = await signedIn.newPage()
        // Keep the browser on the site under test.
        await page.route(
          url => url.origin !== target.baseUrl,
          route => route.abort()
        )
        const response = await page.goto(`${target.baseUrl}${boxer.path}`)
        expect(response?.status()).toBe(200)
        await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
          'href',
          canonicalUrl(boxer.path)
        )
        await expect(page.getByRole('heading', { level: 1, name: boxer.h1 })).toBeVisible()
      } finally {
        await signedIn.close()
      }
      expect(signedInErrors, 'console errors and uncaught errors in the browser').toEqual([])
    })
  })
})

test.describe('no password outside staging', () => {
  test.skip(target.environment === 'staging', 'staging asks for its password')

  test('no response asks for one, with or without the smoke-test header', async ({
    playwright
  }) => {
    for (const headers of [{}, { [SMOKE_TEST_HEADER]: '1' }] as Record<string, string>[]) {
      await withContext(playwright, headers, async context => {
        for (const path of [...pages, ...files, ...others, '/robots.txt']) {
          const response = await context.get(path, { maxRedirects: 0 })
          expect(response.status(), path).not.toBe(401)
          expect(response.headers()['www-authenticate'], path).toBeUndefined()
        }
      })
    }
  })
})
