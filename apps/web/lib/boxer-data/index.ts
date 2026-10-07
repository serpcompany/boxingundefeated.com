/**
 * Boxer data for pages: D1, read on request through `lib/data/` (server-only, fails closed).
 * Every page that reads boxers renders on request (`connection()`), so the build prerenders none
 * of them: profiles, `/boxers/` and its pages, the divisions, the homepage and the HTML sitemap.
 * An unknown slug or division, or a page out of range, is a 404.
 *
 * Pages import from here, never from `lib/data/`: this module maps the D1 rows to what the pages
 * render (`listing.ts`, `profile.ts`).
 */
import {
  type BoxerListingPage,
  type DirectoryCounts,
  type DivisionListingPage,
  type DivisionSummary,
  fromD1DirectoryCounts,
  fromD1DivisionPage,
  fromD1Divisions,
  fromD1Homepage,
  fromD1Page,
  type HomepageView
} from './listing'
import { type BoxerProfileView, fromD1Profile } from './profile'

export type {
  BoxerListingPage,
  DirectoryCounts,
  DivisionListingPage,
  DivisionSummary,
  HomepageView,
  ListedBoxer
} from './listing'
export type { BoxerProfileView, ProfileBout, ProfileBoxer } from './profile'

/**
 * The D1 reads, for a page rendered on request. `connection()` marks the page dynamic, so the
 * build never prerenders it, or reads D1, at build time.
 */
async function d1() {
  const { connection } = await import('next/server')
  await connection()
  return import('../data/boxers')
}

/** A boxer profile by slug, or null when there is none. */
export async function getBoxerProfile(slug: string): Promise<BoxerProfileView | null> {
  const profile = await (await d1()).getBoxerProfile(slug)
  return profile && fromD1Profile(profile)
}

/** A page of `/boxers/` (1-based), or null when it is out of range. */
export async function getBoxersPage(page: number): Promise<BoxerListingPage | null> {
  const listing = await (await d1()).listBoxers(page)
  return listing && fromD1Page(listing)
}

/** Every division in display order, with its boxer count. */
export async function getDivisions(): Promise<DivisionSummary[]> {
  return fromD1Divisions(await (await d1()).listDivisions())
}

/** A page of a division (1-based), or null for an unknown division or a page out of range. */
export async function getDivisionPage(
  slug: string,
  page: number
): Promise<DivisionListingPage | null> {
  const listing = await (await d1()).listBoxersByDivision(slug, page)
  return listing && fromD1DivisionPage(listing)
}

/** The homepage's stats, top fighters and division counts. */
export async function getHomepage(): Promise<HomepageView> {
  return fromD1Homepage(await (await d1()).getHomepageData())
}

/** The boxer count in all and per division, for the HTML sitemap's pagination links. */
export async function getDirectoryCounts(): Promise<DirectoryCounts> {
  return fromD1DirectoryCounts(await (await d1()).getDirectoryCounts())
}
