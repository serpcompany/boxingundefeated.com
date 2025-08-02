import { defineEventHandler } from 'h3'
import { useDrizzle } from '~/server/utils/drizzle'
import { boxers } from '~/server/database/schema'

export default defineEventHandler(async (event) => {
  try {
    const db = useDrizzle()
    const allBoxers = await db.select().from(boxers)
    return allBoxers.map(b => `/boxers/${b.slug}`)
  } catch (error) {
    // Log error for debugging
    console.error('[Sitemap] Failed to fetch boxers:', error)
    
    // Return empty array to prevent sitemap generation errors
    // The sitemap will still generate but without dynamic boxer pages
    return []
  }
})
