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
  ...['/shop/best/brümate-water-bottles/', '/shop/best/nestlé-water-bottles/'].map(path => ({
    path,
    field: 'status' as const,
    actual: '404',
    reason:
      'Known broken: the Worker answers 404 for these non-ASCII slugs, and the sitemaps leave ' +
      'them out. Before the cutover, GitHub Pages served the not-found page with a 200. ' +
      'Serving these two articles is #53.'
  }))
]
