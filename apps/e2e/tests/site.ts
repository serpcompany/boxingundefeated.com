import { basicAuthorization, resolveTarget } from '../src/target'

/** The site under test and what it must show (src/target.ts). */
export const target = resolveTarget(process.env)

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
  /** The document title, which og:title and twitter:title repeat (#87). */
  title: string
}

/**
 * One page of each kind. The boxer and the division are in the committed D1 fixture
 * (`d1/fixtures/boxers.sample.json`), so the seeded local D1 serves them as well as a full import.
 */
export const boxer: SamplePage = {
  name: 'boxer',
  path: '/boxers/manuel-ortiz/',
  h1: 'Manuel Ortiz',
  title: 'Manuel Ortiz - Professional Boxer - Boxing Undefeated'
}

export const samplePages: SamplePage[] = [
  {
    name: 'home',
    path: '/',
    h1: 'Boxing Undefeated',
    title: 'Boxing Undefeated - Professional Boxers Database'
  },
  boxer,
  {
    name: 'listing',
    path: '/boxers/',
    h1: 'Boxers',
    title: 'Boxers Directory - Boxing Undefeated'
  },
  {
    name: 'division',
    path: '/divisions/heavy/',
    h1: 'Heavyweight Boxers',
    title: 'Heavyweight Boxers - Boxing Undefeated'
  },
  {
    name: 'shop article',
    path: '/shop/best/1-inch-thick-yoga-mats/',
    h1: '1 Inch Thick Yoga Mats',
    title: '1 Inch Thick Yoga Mats - Boxing Undefeated'
  },
  // Its slug has a non-ASCII letter: canonical, percent-encoded NFC (#53).
  {
    name: 'shop article with a non-ASCII slug',
    path: '/shop/best/br%C3%BCmate-water-bottles/',
    h1: 'BrüMate Water Bottles',
    title: 'BrüMate Water Bottles - Boxing Undefeated'
  },
  {
    name: 'search',
    path: '/search/',
    h1: 'Search Boxers',
    title: 'Search Boxers - Boxing Undefeated'
  }
]

/** The canonical URL of a path: the homepage is the bare origin. */
export function canonicalUrl(path: string): string {
  return path === '/' ? target.canonicalOrigin : `${target.canonicalOrigin}${path}`
}
