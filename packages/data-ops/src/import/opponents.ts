// The opponent matching of today's pages (`apps/web/lib/opponent-mapper.ts`), so a bout links to
// the same profile in D1 as it does on the static site. Keep the two in step until #10 removes
// the static version.

export interface OpponentCandidate {
  slug: string
  name: string
  birthName: string | null
  proTotalBouts: number
  proWins: number
}

function normalizeName(name: string): string {
  return name.toLowerCase().replace(/\s+/g, ' ').trim()
}

function stripNameSuffix(name: string): string {
  return name.replace(/\s+(jr\.?|sr\.?|iii|ii|iv|v)$/i, '').trim()
}

function nameVariants(name: string): string[] {
  const trimmed = name.trim()
  const normalized = normalizeName(name)
  const stripped = stripNameSuffix(trimmed)
  return Array.from(
    new Set([
      name,
      trimmed,
      normalized,
      stripped,
      normalizeName(stripped),
      stripNameSuffix(normalized)
    ])
  ).filter(Boolean)
}

/**
 * The order of `public/data/boxers/index.json` (`scripts/split-boxer-data.js`): most bouts, then
 * most wins, with ties in source order. Later boxers win name collisions, as on the site.
 */
export function directoryIndexOrder<T extends OpponentCandidate>(boxers: readonly T[]): T[] {
  return [...boxers].sort(
    (a, b) => (b.proTotalBouts || 0) - (a.proTotalBouts || 0) || (b.proWins || 0) - (a.proWins || 0)
  )
}

export interface OpponentIndex {
  lookup(opponentName: string): string | undefined
  /** Name variants that more than one boxer claims; the later boxer in index order wins. */
  collisions: number
}

/** Pass the candidates in index order (`directoryIndexOrder`). */
export function buildOpponentIndex(candidates: readonly OpponentCandidate[]): OpponentIndex {
  const slugs = new Map<string, string>()
  const contested = new Set<string>()
  const add = (name: string | null, slug: string) => {
    if (!name) return
    for (const variant of nameVariants(name)) {
      const current = slugs.get(variant)
      if (current !== undefined && current !== slug) contested.add(variant)
      slugs.set(variant, slug)
    }
  }
  for (const candidate of candidates) {
    add(candidate.name, candidate.slug)
    add(candidate.birthName, candidate.slug)
  }
  return {
    collisions: contested.size,
    lookup(opponentName) {
      if (!opponentName) return undefined
      const exact = slugs.get(opponentName)
      if (exact) return exact
      for (const variant of nameVariants(opponentName)) {
        const slug = slugs.get(variant)
        if (slug) return slug
      }
      return undefined
    }
  }
}
