import { defineEventHandler } from 'h3'
import { useDrizzle } from '~/server/db/drizzle'
import { boxers } from '~/server/db/schema'

export default defineEventHandler(async (event) => {
  try {
    const db = useDrizzle()
    const allBoxers = await db.select().from(boxers)
    
    // Return objects with image data if available
    return allBoxers.map(boxer => {
      const url = `/boxers/${boxer.slug}`
      
      // If boxer has an image, include it in the sitemap
      if (boxer.image || boxer.imageUrl) {
        return {
          loc: url,
          images: [{
            loc: boxer.image || boxer.imageUrl,
            title: boxer.name,
            caption: `Professional boxer ${boxer.name}`
          }]
        }
      }
      
      // Otherwise just return the URL
      return url
    })
  } catch (error) {
    // Log error for debugging
    console.error('[Sitemap] Failed to fetch boxers:', error)
    
    // Return empty array to prevent sitemap generation errors
    // The sitemap will still generate but without dynamic boxer pages
    return []
  }
})
