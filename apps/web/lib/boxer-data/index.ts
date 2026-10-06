/**
 * Boxer data for pages: the one seam between the routes and their two data sources, picked by the
 * build target (`SITE_BUILD_OUTPUT`, which next.config.ts inlines at build time).
 *
 * - `worker`, the OpenNext Worker: D1, read on request through `lib/data/` (server-only, fails
 *   closed). Every page that reads boxers renders on request (`connection()`), so the build
 *   prerenders none of them: profiles, `/boxers/` and its pages, the divisions, the homepage and
 *   the HTML sitemap. An unknown slug or division, or a page out of range, is a 404.
 * - `export`, the static export that GitHub Pages serves until the cutover (#19): the committed
 *   JSON, read with `fs` at build time (`static-export.ts`), so the live site is unchanged.
 *
 * Pages import from here, never from `lib/data/` or the JSON loaders. #20 deletes
 * `static-export.ts` and the switch after the cutover.
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

export class BuildTargetError extends Error {
  override name = 'BuildTargetError'
}

/**
 * The build target next.config.ts inlined. Anything else fails closed: falling through to the
 * JSON in the Worker, which can't read `fs`, would turn every profile into a 404.
 */
export function buildTarget(): 'worker' | 'export' {
  const output = process.env.SITE_BUILD_OUTPUT
  if (output === 'worker' || output === 'export') return output
  throw new BuildTargetError(
    `SITE_BUILD_OUTPUT is ${JSON.stringify(output ?? null)}, not worker or export; boxer data ` +
      'reads fail closed.'
  )
}

/** True in the OpenNext Worker build, whose pages read D1. */
export function readsFromD1(): boolean {
  return buildTarget() === 'worker'
}

/**
 * The D1 reads, for a page rendered on request. `connection()` marks the page dynamic, so the
 * Worker build never prerenders it, or reads D1, at build time.
 */
async function d1() {
  const { connection } = await import('next/server')
  await connection()
  return import('../data/boxers')
}

/** A boxer profile by slug, or null when there is none. */
export async function getBoxerProfile(slug: string): Promise<BoxerProfileView | null> {
  if (readsFromD1()) {
    const profile = await (await d1()).getBoxerProfile(slug)
    return profile && fromD1Profile(profile)
  }
  const { readBoxerProfile } = await import('./static-export')
  return readBoxerProfile(slug)
}

/** A page of `/boxers/` (1-based), or null when it is out of range. */
export async function getBoxersPage(page: number): Promise<BoxerListingPage | null> {
  if (readsFromD1()) {
    const listing = await (await d1()).listBoxers(page)
    return listing && fromD1Page(listing)
  }
  const { readBoxersPage } = await import('./static-export')
  return readBoxersPage(page)
}

/** Every division in display order, with its boxer count. */
export async function getDivisions(): Promise<DivisionSummary[]> {
  if (readsFromD1()) return fromD1Divisions(await (await d1()).listDivisions())
  const { readDivisions } = await import('./static-export')
  return readDivisions()
}

/** A page of a division (1-based), or null for an unknown division or a page out of range. */
export async function getDivisionPage(
  slug: string,
  page: number
): Promise<DivisionListingPage | null> {
  if (readsFromD1()) {
    const listing = await (await d1()).listBoxersByDivision(slug, page)
    return listing && fromD1DivisionPage(listing)
  }
  const { readDivisionPage } = await import('./static-export')
  return readDivisionPage(slug, page)
}

/** The homepage's stats, top fighters and division counts. */
export async function getHomepage(): Promise<HomepageView> {
  if (readsFromD1()) return fromD1Homepage(await (await d1()).getHomepageData())
  const { readHomepage } = await import('./static-export')
  return readHomepage()
}

/** The boxer count in all and per division, for the HTML sitemap's pagination links. */
export async function getDirectoryCounts(): Promise<DirectoryCounts> {
  if (readsFromD1()) return fromD1DirectoryCounts(await (await d1()).getDirectoryCounts())
  const { readDirectoryCounts } = await import('./static-export')
  return readDirectoryCounts()
}

// The static export's `generateStaticParams`. Each is undefined in the Worker, so the build
// prerenders none of those pages and each one renders on request.

/** Every boxer slug. */
export const boxerProfileStaticParams = readsFromD1()
  ? undefined
  : async (): Promise<{ slug: string }[]> => {
      const { getBoxerSlugs } = await import('./static-export')
      return getBoxerSlugs().map(slug => ({ slug }))
    }

/** `/boxers/page/<n>/` from page 2 on. */
export const boxersPageStaticParams = readsFromD1()
  ? undefined
  : async (): Promise<{ page: string }[]> => (await import('./static-export')).getBoxersPageParams()

/** Every division. */
export const divisionStaticParams = readsFromD1()
  ? undefined
  : async (): Promise<{ division: string }[]> =>
      (await import('./static-export')).getDivisionParams()

/** `/divisions/<division>/page/<n>/` from page 2 on. */
export const divisionPageStaticParams = readsFromD1()
  ? undefined
  : async (): Promise<{ division: string; page: string }[]> =>
      (await import('./static-export')).getDivisionPageParams()
