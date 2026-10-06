/**
 * The static export's boxer data: the committed per-boxer JSON in `public/data/boxers/`, read with
 * `fs` while `next build` prerenders. GitHub Pages serves that export until the cutover (#19);
 * #20 deletes this file. The profile reads are moved unchanged from `app/boxers/[slug]/page.tsx`,
 * the listing reads from the listing pages, the homepage and the HTML sitemap.
 */
import fs from 'node:fs'
import path from 'node:path'
import {
  type BoxerMetadata,
  getBoxerBouts,
  getBoxerCategories,
  getBoxersWithoutBouts
} from '../boxers-loader'
import {
  getPaginatedItems,
  getPaginationPages,
  sortBoxersForDirectory
} from '../directory-pagination'
import { getOpponentLinksForBouts } from '../opponent-mapper'
import type {
  BoxerListingPage,
  DirectoryCounts,
  DivisionListingPage,
  DivisionSummary,
  HomepageView
} from './listing'
import type { BoxerProfileView } from './profile'

// Load individual boxer data from split JSON files
function getBoxerBySlugOptimized(slug: string): BoxerMetadata | null {
  try {
    // Try multiple possible paths to handle different working directories
    const possiblePaths = [
      path.join(process.cwd(), 'public/data/boxers', `${slug}.json`),
      path.join(process.cwd(), 'apps/web/public/data/boxers', `${slug}.json`),
      path.join(__dirname, '../../public/data/boxers', `${slug}.json`)
    ]

    for (const filePath of possiblePaths) {
      try {
        const data = fs.readFileSync(filePath, 'utf-8')
        return JSON.parse(data)
      } catch {
        // Try next path
      }
    }
    return null
  } catch {
    return null
  }
}

// Load index for generating static params
export function getBoxerSlugs(): string[] {
  try {
    // Try multiple possible paths to handle different working directories
    const possiblePaths = [
      path.join(process.cwd(), 'public/data/boxers/index.json'),
      path.join(process.cwd(), 'apps/web/public/data/boxers/index.json'),
      path.join(__dirname, '../../public/data/boxers/index.json')
    ]

    let data: string | null = null
    for (const indexPath of possiblePaths) {
      try {
        data = fs.readFileSync(indexPath, 'utf-8')
        break
      } catch {
        // Try next path
      }
    }

    if (!data) {
      console.error('Failed to load boxer index from any path')
      return []
    }

    const index = JSON.parse(data)
    return index.map((boxer: any) => boxer.slug)
  } catch (error) {
    console.error('Failed to load boxer index:', error)
    return []
  }
}

export function readBoxerProfile(slug: string): BoxerProfileView | null {
  const boxer = getBoxerBySlugOptimized(slug)
  if (!boxer) return null

  const bouts = getBoxerBouts(boxer)
  return { boxer, bouts, opponentLinks: getOpponentLinksForBouts(bouts) }
}

export function readBoxersPage(page: number): BoxerListingPage | null {
  return getPaginatedItems(sortBoxersForDirectory(getBoxersWithoutBouts()), page)
}

function countByDivision(boxers: BoxerMetadata[]): DivisionSummary[] {
  return getBoxerCategories().map(category => ({
    slug: category.slug,
    name: category.name,
    boxerCount: boxers.filter(boxer => boxer.proDivision === category.division).length
  }))
}

export function readDivisions(): DivisionSummary[] {
  return countByDivision(getBoxersWithoutBouts())
}

export function readDivisionPage(slug: string, page: number): DivisionListingPage | null {
  const category = getBoxerCategories().find(c => c.slug === slug)
  if (!category) return null

  const divisionBoxers = sortBoxersForDirectory(
    getBoxersWithoutBouts().filter(boxer => boxer.proDivision === category.division)
  )
  const listing = getPaginatedItems(divisionBoxers, page)
  return listing && { ...listing, division: { slug: category.slug, name: category.name } }
}

export function readHomepage(): HomepageView {
  const boxers = getBoxersWithoutBouts()

  return {
    totalBoxers: boxers.length,
    activeBoxers: boxers.filter(b => !b.proStatus || b.proStatus !== 'inactive').length,
    totalBouts: boxers.reduce((sum, b) => sum + (b.proTotalBouts || 0), 0),
    eliteBoxers: boxers.filter(
      b => b.proWins && b.proWins > 30 && (!b.proLosses || b.proLosses < 5)
    ).length,
    // The highest win counts.
    featuredBoxers: boxers
      .filter(b => b.proWins && b.proTotalBouts)
      .sort((a, b) => (b.proWins || 0) - (a.proWins || 0))
      .slice(0, 6),
    divisions: countByDivision(boxers)
  }
}

export function readDirectoryCounts(): DirectoryCounts {
  const boxers = getBoxersWithoutBouts()
  return { totalBoxers: boxers.length, divisions: countByDivision(boxers) }
}

/** `/boxers/page/<n>/` from 2 on: page 1 is `/boxers/`. */
export function getBoxersPageParams(): { page: string }[] {
  return getPaginationPages(getBoxersWithoutBouts().length)
    .slice(1)
    .map(page => ({ page: page.toString() }))
}

export function getDivisionParams(): { division: string }[] {
  return getBoxerCategories().map(category => ({ division: category.slug }))
}

/** `/divisions/<division>/page/<n>/` from 2 on: page 1 is `/divisions/<division>/`. */
export function getDivisionPageParams(): { division: string; page: string }[] {
  return readDivisions().flatMap(division =>
    getPaginationPages(division.boxerCount)
      .slice(1)
      .map(page => ({ division: division.slug, page: page.toString() }))
  )
}
