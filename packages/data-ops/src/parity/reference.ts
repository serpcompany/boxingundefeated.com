// What the static site showed before boxer data moved to D1 (#19, #20), frozen here as the parity
// check's reference: the 17 divisions of `getBoxerCategories()` and the opponent links of
// `getOpponentSlug()`, which read the boxer index the static build wrote from the pipeline source.
// That index and those modules are gone (#20), so the reference rebuilds the same index from the
// source records. Like `rules.ts`, it is written separately from the importer's
// mapping on purpose: never import from `../import/` here (a test enforces it).

/** The divisions in display order: slug, name and the `proDivision` value boxers carry. */
export const REFERENCE_DIVISIONS: readonly { slug: string; name: string; division: string }[] = [
  { slug: 'heavy', name: 'Heavyweight', division: 'heavy' },
  { slug: 'light-heavy', name: 'Light Heavyweight', division: 'light heavy' },
  { slug: 'cruiser', name: 'Cruiserweight', division: 'cruiser' },
  { slug: 'super-middle', name: 'Super Middleweight', division: 'super middle' },
  { slug: 'middle', name: 'Middleweight', division: 'middle' },
  { slug: 'super-welter', name: 'Super Welterweight', division: 'super welter' },
  { slug: 'welter', name: 'Welterweight', division: 'welter' },
  { slug: 'super-light', name: 'Super Lightweight', division: 'super light' },
  { slug: 'light', name: 'Lightweight', division: 'light' },
  { slug: 'super-feather', name: 'Super Featherweight', division: 'super feather' },
  { slug: 'feather', name: 'Featherweight', division: 'feather' },
  { slug: 'super-bantam', name: 'Super Bantamweight', division: 'super bantam' },
  { slug: 'bantam', name: 'Bantamweight', division: 'bantam' },
  { slug: 'super-fly', name: 'Super Flyweight', division: 'super fly' },
  { slug: 'fly', name: 'Flyweight', division: 'fly' },
  { slug: 'light-fly', name: 'Light Flyweight', division: 'light fly' },
  { slug: 'minimum', name: 'Minimumweight', division: 'minimum' }
]

type SourceRecord = Record<string, unknown>

/** The slug the static site used: the record's own, else one made from the name. */
function referenceSlug(record: SourceRecord): string {
  if (typeof record.slug === 'string' && record.slug) return record.slug
  return String(record.name ?? '')
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^\w-]/g, '')
}

function normalizeName(name: string): string {
  return name.toLowerCase().replace(/\s+/g, ' ').trim()
}

function stripNameSuffix(name: string): string {
  return name.replace(/\s+(jr\.?|sr\.?|iii|ii|iv|v)$/i, '').trim()
}

function lookupVariants(name: string): string[] {
  const trimmedName = name.trim()
  const normalizedName = normalizeName(name)
  const suffixStrippedName = stripNameSuffix(trimmedName)
  return Array.from(
    new Set([
      name,
      trimmedName,
      normalizedName,
      suffixStrippedName,
      normalizeName(suffixStrippedName),
      stripNameSuffix(normalizedName)
    ])
  ).filter(Boolean)
}

/**
 * The static site's opponent lookup over every source record (dropped boxers included, as in
 * its index): the index sorted by most bouts, then most wins, ties in source order; each name and
 * birth name mapped by all its variants, a later boxer overwriting an earlier one.
 */
export function referenceOpponentSlugs(
  records: readonly SourceRecord[]
): (opponentName: string) => string | undefined {
  const count = (value: unknown) => (typeof value === 'number' ? value : 0)
  const index = [...records].sort(
    (a, b) => count(b.proTotalBouts) - count(a.proTotalBouts) || count(b.proWins) - count(a.proWins)
  )
  const map = new Map<string, string>()
  for (const record of index) {
    const slug = referenceSlug(record)
    for (const name of [record.name, record.birthName]) {
      if (typeof name !== 'string' || !name) continue
      for (const variant of lookupVariants(name)) map.set(variant, slug)
    }
  }
  return opponentName => {
    if (!opponentName) return undefined
    const exact = map.get(opponentName)
    if (exact) return exact
    for (const variant of lookupVariants(opponentName)) {
      const slug = map.get(variant)
      if (slug) return slug
    }
    return undefined
  }
}
