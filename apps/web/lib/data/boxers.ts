import 'server-only'

import {
  type BoxerPage,
  type BoxerProfile,
  type DirectoryCounts,
  type DivisionBoxerPage,
  type DivisionWithCount,
  type HomepageData,
  getBoxerProfile as queryBoxerProfile,
  listBoxers as queryBoxers,
  listBoxersByDivision as queryBoxersByDivision,
  getDirectoryCounts as queryDirectoryCounts,
  listDivisions as queryDivisions,
  getHomepageData as queryHomepageData
} from '@boxingundefeated/data-ops'
import { cache } from 'react'
import { getDatabase } from './database'

export type { BoxerPage, BoxerProfile, DirectoryCounts, DivisionBoxerPage, HomepageData }

// Each read is one D1 round trip (a single statement, or a D1 batch), delegated to data-ops, and
// cached per request, so `generateMetadata` and the page share it.

/** A boxer and their bouts with opponent slugs. */
export const getBoxerProfile = cache(
  async (slug: string): Promise<BoxerProfile | null> => queryBoxerProfile(await getDatabase(), slug)
)

/** A page of `/boxers/`, or null when it is out of range. */
export const listBoxers = cache(
  async (page: number): Promise<BoxerPage | null> => queryBoxers(await getDatabase(), { page })
)

/** A page of a division, or null for an unknown division or a page out of range. */
export const listBoxersByDivision = cache(
  async (slug: string, page: number): Promise<DivisionBoxerPage | null> =>
    queryBoxersByDivision(await getDatabase(), slug, { page })
)

/** Every division in display order, with its boxer count. */
export const listDivisions = cache(
  async (): Promise<DivisionWithCount[]> => queryDivisions(await getDatabase())
)

/** The homepage's stats, top fighters and division counts. */
export const getHomepageData = cache(
  async (): Promise<HomepageData> => queryHomepageData(await getDatabase())
)

/** The boxer count in all and per division. */
export const getDirectoryCounts = cache(
  async (): Promise<DirectoryCounts> => queryDirectoryCounts(await getDatabase())
)
