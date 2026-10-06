import { resolveTarget } from '../src/target'

/** The site under test and what it must show (src/target.ts). */
export const target = resolveTarget(process.env)

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
  { name: 'search', path: '/search/', h1: 'Search Boxers' }
]

/** The canonical URL of a path: the homepage is the bare origin. */
export function canonicalUrl(path: string): string {
  return path === '/' ? target.canonicalOrigin : `${target.canonicalOrigin}${path}`
}
