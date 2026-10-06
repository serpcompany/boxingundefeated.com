/**
 * The static export's boxer data: the committed per-boxer JSON in `public/data/boxers/`, read with
 * `fs` while `next build` prerenders. GitHub Pages serves that export until the cutover (#19);
 * #20 deletes this file. Moved unchanged from `app/boxers/[slug]/page.tsx`.
 */
import fs from 'node:fs'
import path from 'node:path'
import { type BoxerMetadata, getBoxerBouts } from '../boxers-loader'
import { getOpponentLinksForBouts } from '../opponent-mapper'
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
