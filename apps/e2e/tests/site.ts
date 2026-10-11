import { basicAuthorization, resolveTarget } from '../src/target'

/** The site under test and what it must show (src/target.ts). */
export const target = resolveTarget(process.env)

/**
 * `Authorization` with staging's password (`STAGING_BASIC_AUTH_PASSWORD`), for staging tests that
 * request without the smoke-test header. Throws without it: a staging run must test the password.
 */
export function stagingAuthorization(password?: string, username?: string): string {
  const expected = target.stagingPassword
  if (!expected) {
    throw new Error('Set STAGING_BASIC_AUTH_PASSWORD (stagingpassword) with EXPECT_ENV=staging.')
  }
  return basicAuthorization(password ?? expected, username)
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
  {
    name: 'shop article',
    path: '/shop/best/1-inch-thick-yoga-mats/',
    h1: '1 Inch Thick Yoga Mats'
  },
  // Its slug has a non-ASCII letter: canonical, percent-encoded NFC (#53).
  {
    name: 'shop article with a non-ASCII slug',
    path: '/shop/best/br%C3%BCmate-water-bottles/',
    h1: 'BrüMate Water Bottles'
  },
  { name: 'search', path: '/search/', h1: 'Search Boxers' }
]

/** The canonical URL of a path: the homepage is the bare origin. */
export function canonicalUrl(path: string): string {
  return path === '/' ? target.canonicalOrigin : `${target.canonicalOrigin}${path}`
}
