/**
 * Records the importer skips on purpose. Each one is listed in the parity report, its URL stops
 * resolving once pages read from D1 (#10), and the Worker build leaves it out of the listings.
 */
export const INTENTIONAL_DROPS: Readonly<Record<string, string>> = {
  world:
    'Misparsed pipeline row: name "World", nationality "Usyk", no record and no bouts, and a ' +
    'bio about Chris Staples (BoxRec 808714). Not a boxer profile.'
}
