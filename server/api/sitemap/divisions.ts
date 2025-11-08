import { defineEventHandler, setHeader } from 'h3'
import { useDrizzle } from '~/server/db/drizzle'
import { divisions } from '~/server/db/schema'

export default defineEventHandler(async (event) => {
  try {
    setHeader(event, 'Cache-Control', 'public, max-age=0, s-maxage=86400, stale-while-revalidate=3600')

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
