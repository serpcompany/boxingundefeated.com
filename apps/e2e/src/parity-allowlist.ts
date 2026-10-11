import type { ParityField } from './parity'

export interface AllowedDifference {
  /** The URL path as the site serves it, for example `/boxers/world/`. */
  path: string
  field: ParityField
  /** The candidate's value it allows, for example `404`; any value when unset. */
  actual?: string
  /** Why the candidate may differ from the reference here. */
  reason: string
}

/**
 * Differences between the candidate and the live site that are intended or known. Every entry
 * needs a reason; the report lists entries that no longer match anything, so remove those.
 */
export const PARITY_ALLOWLIST: AllowedDifference[] = [
  {
    path: '/boxers/world/',
    field: 'status',
    actual: '404',
    reason:
      'Intentional: the importer drops the `world` placeholder record, so the Worker answers 404 ' +
      '(#9, #33), and the sitemaps no longer list it (#15).'
  },
  {
    path: '/brands/',
    field: 'status',
    actual: '410',
    reason:
      'Intentional: retired with 410 Gone (#59), and dropped from the pages sitemap. Stale once ' +
      'production serves the 410 and its sitemap no longer lists it; remove it then.'
  }
]
