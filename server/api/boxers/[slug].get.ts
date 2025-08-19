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

    // Extract bouts from the JSON field and separate from boxer data
    const { bouts } = boxer
    const validatedFights = (bouts as any[]) || []

    // Calculate additional stats
    const totalFights = validatedFights.length
    const wins = validatedFights.filter((f) => f.result === 'win').length
    const losses = validatedFights.filter((f) => f.result === 'loss').length
    const draws = validatedFights.filter((f) => f.result === 'draw').length
    const koWins = validatedFights.filter(
      (f) => f.result === 'win' && ['ko', 'tko'].includes(f.resultMethod || ''),
    ).length
    const titleFights = validatedFights.filter((f) => f.titleFight).length

    return {
      boxer: boxer,
      fights: validatedFights,
      stats: {
        totalFights,
        wins,
        losses,
        draws,
        koWins,
        titleFights,
        winPercentage:
          totalFights > 0 ? Math.round((wins / totalFights) * 100) : 0,
        koPercentage: wins > 0 ? Math.round((koWins / wins) * 100) : 0,
      },
    }
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
