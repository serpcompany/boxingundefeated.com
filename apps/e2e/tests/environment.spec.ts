import { expect, test } from '@playwright/test'
import { isNoindex, pageFacts } from '../src/html'
import { GTM_ID } from '../src/target'
import { boxer, target } from './site'

/**
 * Environment behavior (serpcompany/serp docs/engineering/standards/environment-configuration.md,
 * "Verification"; apps/web/lib/site-config.ts): only production is indexable, lists its sitemap
 * and loads Google Tag Manager. Staging and local send noindex and disallow crawling.
 */
const production = target.environment === 'production'

test(`robots.txt is the ${target.environment} policy`, async ({ request }) => {
  const response = await request.get('/robots.txt', { maxRedirects: 0 })
  expect(response.status()).toBe(200)
  const lines = (await response.text()).split('\n').map(line => line.trim())
  const disallowsAll = lines.some(line => /^disallow:\s*\/$/i.test(line))

  if (production) {
    expect(
      lines.some(line => /^allow:\s*\/$/i.test(line)),
      'Allow: /'
    ).toBe(true)
    expect(disallowsAll, 'Disallow: /').toBe(false)
    expect(lines).toContain(`Sitemap: ${target.canonicalOrigin}/sitemap-index.xml`)
    expect(isNoindex(response.headers()['x-robots-tag'])).toBe(false)
  } else {
    expect(disallowsAll, 'Disallow: /').toBe(true)
    expect(
      lines.some(line => /^sitemap:/i.test(line)),
      'no Sitemap line'
    ).toBe(false)
    expect(isNoindex(response.headers()['x-robots-tag'])).toBe(true)
  }
})

for (const path of ['/', boxer.path]) {
  test(`${path} has the ${target.environment} crawl policy and analytics`, async ({ request }) => {
    const response = await request.get(path, { maxRedirects: 0 })
    expect(response.status()).toBe(200)
    const html = await response.text()
    const { robots } = pageFacts(html)
    const header = response.headers()['x-robots-tag']

    if (production) {
      expect(isNoindex(header), `X-Robots-Tag: ${header}`).toBe(false)
      expect(isNoindex(robots), `<meta name="robots" content="${robots}">`).toBe(false)
      expect(html).toContain(`googletagmanager.com/gtm.js`)
      expect(html).toContain(GTM_ID)
    } else {
      expect(isNoindex(header), `X-Robots-Tag: ${header}`).toBe(true)
      expect(isNoindex(robots), `<meta name="robots" content="${robots}">`).toBe(true)
      expect(html).not.toContain('googletagmanager.com')
      expect(html).not.toContain(GTM_ID)
    }
  })
}
