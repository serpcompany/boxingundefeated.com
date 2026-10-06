import 'server-only'

import { type BoxerProfile, getBoxerProfile as queryBoxerProfile } from '@boxingundefeated/data-ops'
import { cache } from 'react'
import { getDatabase } from './database'

export type { BoxerProfile }

/**
 * A boxer and their bouts with opponent slugs: one D1 round trip (`getBoxerProfile` in
 * data-ops). Cached per request, so `generateMetadata` and the page share it.
 */
export const getBoxerProfile = cache(
  async (slug: string): Promise<BoxerProfile | null> => queryBoxerProfile(await getDatabase(), slug)
)
