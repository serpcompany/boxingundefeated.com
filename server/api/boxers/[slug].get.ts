import { boxers, boxerBouts } from '~/server/database/schema'
import { eq, desc } from 'drizzle-orm'
import { transformBoxerForFrontend } from '~/server/utils/transformers'

export default defineEventHandler(async (event) => {
  try {
    const db = useDrizzle()
    const slug = getRouterParam(event, 'slug')
    
    if (!slug) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Slug parameter is required'
      })
    }
    
    // Get boxer by slug
    const boxerResults = await db
      .select()
      .from(boxers)
      .where(eq(boxers.slug, slug))
      .limit(1)
    
    if (boxerResults.length === 0) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Boxer not found'
      })
    }
    
    const boxer = boxerResults[0]
    
    // Get boxer's fights (ordered by date, most recent first)
    // BoxerBouts uses padded boxrecId (e.g., '008993' for boxrecId '8993')
    const paddedBoxrecId = boxer.boxrecId ? boxer.boxrecId.padStart(6, '0') : ''
    const fightsResults = await db
      .select()
      .from(boxerBouts)
      .where(eq(boxerBouts.boxerId, paddedBoxrecId))
      .orderBy(desc(boxerBouts.boutDate))
    
    // Use data directly without validation for now
    const validatedBoxer = boxer
    const validatedFights = fightsResults
    
    // Calculate additional stats
    const totalFights = validatedFights.length
    const wins = validatedFights.filter(f => f.result === 'win').length
    const losses = validatedFights.filter(f => f.result === 'loss').length
    const draws = validatedFights.filter(f => f.result === 'draw').length
    const koWins = validatedFights.filter(f => f.result === 'win' && ['ko', 'tko'].includes(f.resultMethod || '')).length
    const titleFights = validatedFights.filter(f => f.titleFight).length
    
    return {
      boxer: transformBoxerForFrontend(validatedBoxer),
      fights: validatedFights,
      stats: {
        totalFights,
        wins,
        losses,
        draws,
        koWins,
        titleFights,
        winPercentage: totalFights > 0 ? Math.round((wins / totalFights) * 100) : 0,
        koPercentage: wins > 0 ? Math.round((koWins / wins) * 100) : 0,
      }
    }
    
  } catch (error) {
    if (error.statusCode) {
      throw error // Re-throw HTTP errors
    }
    
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to fetch boxer',
      data: error instanceof Error ? error.message : 'Unknown error'
    })
  }
})