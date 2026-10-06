import { expect, test } from '@playwright/test'
import { SMOKE_TEST_HEADER } from '../src/target'
import { boxer, target } from './site'

/**
 * Canonical hosts (serpcompany/serp docs/engineering/standards/environment-configuration.md,
 * "Verification"): `*.workers.dev` and `www` answer one 308 to the canonical origin, with the
 * path already canonical and /api paths unchanged. Requests with the smoke-test header are
 * served instead, so CI can test a deployment through its platform host.
 */
const redirects: Array<[string, string]> = [
  ['/', '/'],
  ['/about', '/about/'],
  [boxer.path, boxer.path],
  ['/shop/best/2.7-l-water-bottles', '/shop/best/2.7-l-water-bottles/'],
  ['/robots.txt/', '/robots.txt'],
  // Old sitemap URLs go straight to the index, in one hop.
  ['/sitemap.xml', '/sitemap-index.xml'],
  ['/sitemaps/pages/1.xml/', '/sitemap-index.xml'],
  // /api keeps its exact path, with or without the slash.
  ['/api/search/?q=ortiz', '/api/search/?q=ortiz'],
  ['/api/search?q=ortiz', '/api/search?q=ortiz']
]

test.describe('non-canonical hosts', () => {
  test.skip(
    target.nonCanonicalHosts.length === 0,
    `no non-canonical hosts for EXPECT_ENV=${target.environment}: the local config turns the redirect off`
  )

  for (const host of target.nonCanonicalHosts) {
    test(`${host.host} answers one 308 to ${target.canonicalOrigin}`, async ({ playwright }) => {
      // Without the suite's default headers, which carry the smoke-test header for workers.dev.
      const context = await playwright.request.newContext({ extraHTTPHeaders: {} })
      try {
        for (const [from, to] of redirects) {
          // After a deploy, the new version can take a few seconds to reach every edge.
          await expect(async () => {
            const response = await context.get(`${host.url}${from}`, {
              headers: host.headers,
              maxRedirects: 0
            })
            expect(response.status(), `${host.host}${from}`).toBe(308)
            expect(response.headers().location, `${host.host}${from}`).toBe(
              `${target.canonicalOrigin}${to}`
            )
          }).toPass({ timeout: 30_000, intervals: [1_000, 2_000, 5_000] })
        }

        const smokeHeaders = { ...host.headers, [SMOKE_TEST_HEADER]: '1' }
        const page = await context.get(`${host.url}/about/`, {
          headers: smokeHeaders,
          maxRedirects: 0
        })
        expect(page.status(), 'with the smoke-test header the page is served').toBe(200)
        for (const path of ['/api/search?q=ortiz', '/api/search/?q=ortiz']) {
          const api = await context.get(`${host.url}${path}`, {
            headers: smokeHeaders,
            maxRedirects: 0
          })
          expect(api.status(), `${host.host}${path} with the smoke-test header`).toBe(200)
        }
      } finally {
        await context.dispose()
      }
    })
  }
})
