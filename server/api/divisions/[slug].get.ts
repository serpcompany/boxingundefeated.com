import { divisions, boxers } from '~/server/database/schema'
import { divisionSelectSchema, boxerSelectSchema } from '~/server/database/validation'
import { eq, desc, count } from 'drizzle-orm'
import { z } from 'zod'

// Query parameters validation schema
const divisionQuerySchema = z.object({
  include_boxers: z.enum(['true', 'false']).default('false'),
  boxer_limit: z.number().min(1).max(50).default(10),
})

export default defineEventHandler(async (event) => {
  try {
    const db = useDrizzle()
    const slug = getRouterParam(event, 'slug')
    const query = getQuery(event)
    
    if (!slug) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Slug parameter is required'
      })
    }
    
    // Validate query parameters
    const { include_boxers, boxer_limit } = divisionQuerySchema.parse({
      ...query,
      boxer_limit: query.boxer_limit ? Number(query.boxer_limit) : 10,
    })
    
    // Get division by slug
    const divisionResults = await db
      .select()
      .from(divisions)
      .where(eq(divisions.slug, slug))
      .limit(1)
    
    if (divisionResults.length === 0) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Division not found'
      })
    }
    
    const division = divisionResults[0]
    
    // Validate and parse division data
    const validatedDivision = divisionSelectSchema.parse(division)
    
    // Parse alternativeNames JSON string if it exists
    let alternativeNames: string[] | undefined
    if (validatedDivision.alternativeNames) {
      try {
        alternativeNames = JSON.parse(validatedDivision.alternativeNames)
      } catch {
        alternativeNames = undefined
      }
    }
    
    const parsedDivision = {
      ...validatedDivision,
      alternativeNames
    }
    
    // Get total boxer count for this division
    const totalBoxersResults = await db
      .select({ count: count() })
      .from(boxers)
      .where(eq(boxers.proDivision, slug))
    
    const totalBoxers = totalBoxersResults[0]?.count || 0
    
    let topBoxers = []
    
    // If boxers are requested, get top boxers in this division
    if (include_boxers === 'true') {
      const boxerResults = await db
        .select()
        .from(boxers)
        .where(eq(boxers.proDivision, slug))
        .orderBy(desc(boxers.ranking), desc(boxers.proWins))
        .limit(boxer_limit)
      
      topBoxers = boxerResults.map(boxer => boxerSelectSchema.parse(boxer))
    }
    
    // Calculate weight in other units
    const weightLimitKg = Math.round(parsedDivision.weightLimitPounds * 0.453592 * 10) / 10
    const weightLimitStone = Math.floor(parsedDivision.weightLimitPounds / 14)
    const weightLimitStonePounds = parsedDivision.weightLimitPounds % 14
    
    return {
      division: parsedDivision,
      weightLimits: {
        pounds: parsedDivision.weightLimitPounds,
        kilograms: weightLimitKg,
        stone: `${weightLimitStone}st ${Math.round(weightLimitStonePounds)}lbs`
      },
      stats: {
        totalBoxers
      },
      ...(include_boxers === 'true' && { topBoxers })
    }
    
  } catch (error) {
    if (error.statusCode) {
      throw error // Re-throw HTTP errors
    }
    
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to fetch division',
      data: error instanceof Error ? error.message : 'Unknown error'
    })
  }
})