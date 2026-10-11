import { type BrowserContext, test as base, type ConsoleMessage, expect } from '@playwright/test'
import { basicAuthorization, resolveTarget } from '../src/target'

/** The site under test and what it must show (src/target.ts). */
export const target = resolveTarget(process.env)

const FAILED_LOAD = 'Failed to load resource'
const ERROR_STATUS = /^Failed to load resource: the server responded with a status of (\d{3})\b/

/**
 * Chrome logs every failed request as a console error. The browser tests abort each request to
 * another origin, to stay off third-party hosts and out of analytics, so another origin's failed
 * resource (a boxer photo still hot-linked from boxrec.com until the copy reaches it (#64), the
 * DR badge, Cloudflare's injected Web Analytics beacon) is noise. The site's own failed requests
 * still fail the test.
 */
function isThirdPartyLoadFailure(message: ConsoleMessage): boolean {
  const { url } = message.location()
  return (
    message.text().startsWith(FAILED_LOAD) &&
    URL.canParse(url) &&
    new URL(url).origin !== new URL(target.baseUrl).origin
  )
}

/** The page's own document answering one of `statuses`, which Chrome also logs as an error. */
function isExpectedPageStatus(message: ConsoleMessage, statuses: number[]): boolean {
  const status = ERROR_STATUS.exec(message.text())?.[1]
  return (
    status !== undefined &&
    statuses.includes(Number(status)) &&
    message.location().url === message.page()?.url()
  )
}

/**
 * Collects the console errors and uncaught errors of every page in `context` for the test to fail
 * on, except a page answering one of `expectedPageStatuses` itself. The `context` fixture below
 * does this for every test; a test that opens its own context calls it too.
 */
export function watchBrowserErrors(
  context: BrowserContext,
  expectedPageStatuses: number[] = []
): string[] {
  const errors: string[] = []
  context.on('console', message => {
    if (message.type() !== 'error' || isThirdPartyLoadFailure(message)) return
    if (isExpectedPageStatus(message, expectedPageStatuses)) return
    errors.push(`console error on ${message.page()?.url()}: ${message.text()}`)
  })
  context.on('weberror', webError => {
    errors.push(`uncaught error on ${webError.page()?.url()}: ${webError.error().message}`)
  })
  return errors
}

/**
 * Playwright's `test`, failing any test whose pages log a console error or throw an uncaught
 * error (SERP repository layout: "A console error fails the test"). Every spec imports `test` and
 * `expect` from here.
 */
export const test = base.extend<{ expectedPageStatuses: number[] }>({
  /** Error statuses a test's pages answer on purpose, such as a not-found page's 404. */
  expectedPageStatuses: [[], { option: true }],
  context: async ({ context, expectedPageStatuses }, use) => {
    const errors = watchBrowserErrors(context, expectedPageStatuses)
    await use(context)
    expect(errors, 'console errors and uncaught errors in the browser').toEqual([])
  }
})

export { expect }

/**
 * `Authorization` with staging's password (`target.stagingPassword`), or another one, for staging
 * tests that request without the smoke-test header.
 */
export function stagingAuthorization(password?: string, username?: string): string {
  return basicAuthorization(password ?? target.stagingPassword, username)
}

export interface SamplePage {
  name: string
  path: string
  h1: string
}

/**
 * One page of each kind. The boxer and the division are in the committed D1 fixture
 * (`d1/fixtures/boxers.sample.json`), so the seeded local D1 serves them as well as a full import.
 */
export const boxer: SamplePage = {
  name: 'boxer',
  path: '/boxers/manuel-ortiz/',
  h1: 'Manuel Ortiz'
}

export const samplePages: SamplePage[] = [
  { name: 'home', path: '/', h1: 'Boxing Undefeated' },
  boxer,
  { name: 'listing', path: '/boxers/', h1: 'Boxers' },
  { name: 'division', path: '/divisions/heavy/', h1: 'Heavyweight Boxers' },
  { name: 'search', path: '/search/', h1: 'Search Boxers' }
]

/** The canonical URL of a path: the homepage is the bare origin. */
export function canonicalUrl(path: string): string {
  return path === '/' ? target.canonicalOrigin : `${target.canonicalOrigin}${path}`
}

/** The document title of each sample page, which og:title and twitter:title repeat (#87). */
export const sampleTitles: Record<string, string> = {
  '/': 'Boxing Undefeated - Professional Boxers Database',
  [boxer.path]: 'Manuel Ortiz Record, Stats & Fights - Boxing Undefeated',
  '/boxers/': 'Boxers Directory - Boxing Undefeated',
  '/divisions/heavy/': 'Heavyweight Boxers - Boxing Undefeated',
  '/search/': 'Search Boxers - Boxing Undefeated'
}

/**
 * Boxer profiles on either side of the 60-character limit past which a profile's title drops the
 * site name (apps/web/lib/metadata.ts). Both are in the fixture too.
 */
export const boxerTitleLimitSamples: Array<{ path: string; title: string }> = [
  {
    path: '/boxers/jonathan-gonzalez/',
    title: 'Jonathan Gonzalez Record, Stats & Fights - Boxing Undefeated'
  },
  { path: '/boxers/demetrius-williams/', title: 'Demetrius Williams Record, Stats & Fights' }
]
