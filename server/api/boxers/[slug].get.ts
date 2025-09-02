import { boxers } from '~/server/db/schema'
import { eq } from 'drizzle-orm'
import { useDrizzle } from '~/server/db/drizzle'

export default defineEventHandler(async (event) => {
  try {
    const db = useDrizzle()
    const slug = getRouterParam(event, 'slug')

    if (!slug) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Slug parameter is required',
      })
    }

    // Get boxer by slug
    const [boxer] = await db
      .select()
      .from(boxers)
      .where(eq(boxers.slug, slug))
      .limit(1)

    if (!boxer) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Boxer not found',
      })
    }

    return boxer
  } catch (error: any) {
    if (error.statusCode) {
      throw error // Re-throw HTTP errors
    }

    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to fetch boxer',
      data: error instanceof Error ? error.message : 'Unknown error',
    })
  }
})
