import fs from 'node:fs'
import path from 'node:path'

// Cache for opponent name to slug mapping
let opponentMap: Map<string, string> | null = null

function normalizeName(name: string): string {
  return name.toLowerCase().replace(/\s+/g, ' ').trim()
}

function stripNameSuffix(name: string): string {
  return name.replace(/\s+(jr\.?|sr\.?|iii|ii|iv|v)$/i, '').trim()
}

function getNameLookupVariants(name: string): string[] {
  const trimmedName = name.trim()
  const normalizedName = normalizeName(name)
  const suffixStrippedName = stripNameSuffix(trimmedName)
  const normalizedSuffixStrippedName = stripNameSuffix(normalizedName)

  return Array.from(
    new Set([
      name,
      trimmedName,
      normalizedName,
      suffixStrippedName,
      normalizeName(suffixStrippedName),
      normalizedSuffixStrippedName
    ])
  ).filter(Boolean)
}

function addNameVariantsToMap(
  map: Map<string, string>,
  name: string | null | undefined,
  slug: string
) {
  if (!name) return

  for (const variant of getNameLookupVariants(name)) {
    map.set(variant, slug)
  }
}

/**
 * Creates a mapping of boxer names to their slugs for quick opponent lookup
 * This runs at build time only
 */
export function getOpponentSlugMap(): Map<string, string> {
  if (opponentMap) {
    return opponentMap
  }

  opponentMap = new Map()

  try {
    // Read the index file that has all boxer names and slugs
    const indexPath = path.join(process.cwd(), 'public/data/boxers', 'index.json')
    const data = fs.readFileSync(indexPath, 'utf-8')
    const boxers = JSON.parse(data)

    // Create mappings for both regular names and birth names
    for (const boxer of boxers) {
      addNameVariantsToMap(opponentMap, boxer.name, boxer.slug)
      addNameVariantsToMap(opponentMap, boxer.birthName, boxer.slug)
    }
  } catch (error) {
    console.error('Failed to create opponent map:', error)
  }

  return opponentMap
}

/**
 * Gets the slug for an opponent name if they exist in our database
 */
export function getOpponentSlug(opponentName: string): string | undefined {
  if (!opponentName) return undefined

  const map = getOpponentSlugMap()

  // Try exact match first
  let slug = map.get(opponentName)
  if (slug) return slug

  for (const variant of getNameLookupVariants(opponentName)) {
    slug = map.get(variant)
    if (slug) return slug
  }

  return undefined
}

/**
 * Pre-compute opponent links for a list of bouts
 * Returns a map of opponent names to their slugs
 */
export function getOpponentLinksForBouts(
  bouts: Array<{ opponentName: string }>
): Map<string, string> {
  const links = new Map<string, string>()

  for (const bout of bouts) {
    if (bout.opponentName && !links.has(bout.opponentName)) {
      const slug = getOpponentSlug(bout.opponentName)
      if (slug) {
        links.set(bout.opponentName, slug)
      }
    }
  }

  return links
}
