/**
 * Boxer data for pages: the one seam between the routes and their two data sources, picked by the
 * build target (`SITE_BUILD_OUTPUT`, which next.config.ts inlines at build time).
 *
 * - `worker`, the OpenNext Worker: D1, read on request through `lib/data/` (server-only, fails
 *   closed). Profiles are not prerendered; an unknown slug is a 404.
 * - `export`, the static export that GitHub Pages serves until the cutover (#19): the committed
 *   JSON, read with `fs` at build time (`static-export.ts`), so the live site is unchanged.
 *
 * Pages import from here, never from `lib/data/` or the JSON loaders. #11 adds the listing reads
 * the same way; #20 deletes `static-export.ts` and the switch after the cutover.
 */
import { type BoxerProfileView, fromD1Profile } from './profile'

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

/** A boxer profile by slug, or null when there is none. */
export async function getBoxerProfile(slug: string): Promise<BoxerProfileView | null> {
  if (readsFromD1()) {
    const { getBoxerProfile: readProfile } = await import('../data/boxers')
    const profile = await readProfile(slug)
    return profile && fromD1Profile(profile)
  }
  const { readBoxerProfile } = await import('./static-export')
  return readBoxerProfile(slug)
}

/**
 * Every boxer slug, for the static export's `generateStaticParams`. Undefined in the Worker, so
 * the build prerenders no profiles and each one renders on request.
 */
export const boxerProfileStaticParams = readsFromD1()
  ? undefined
  : async (): Promise<{ slug: string }[]> => {
      const { getBoxerSlugs } = await import('./static-export')
      return getBoxerSlugs().map(slug => ({ slug }))
    }
