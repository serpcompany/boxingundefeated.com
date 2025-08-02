import { defineEventHandler } from 'h3'
import { useDrizzle } from '~/server/utils/drizzle'
import { divisions } from '~/server/database/schema'

export default defineEventHandler(async (event) => {
  try {
    const db = useDrizzle()
    const allDivisions = await db.select().from(divisions)
    return allDivisions.map(d => `/divisions/${d.slug}`)
  } catch (error) {
    // Log error for debugging
    console.error('[Sitemap] Failed to fetch divisions:', error)
    
    // Return empty array to prevent sitemap generation errors
    // The sitemap will still generate but without dynamic division pages
    return []
  }
})
