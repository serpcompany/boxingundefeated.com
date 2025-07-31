import { divisions, boxers } from '~/server/database/schema'
import { divisionSelectSchema } from '~/server/database/validation'
import { eq, count, asc } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  try {
    const db = useDrizzle()
    const query = getQuery(event)
    
    // Get include_stats parameter
    const includeStats = query.include_stats === 'true'
    
    // Get all divisions ordered by weight limit (lightest to heaviest)
    const divisionResults = await db
      .select()
      .from(divisions)
      .orderBy(asc(divisions.weightLimitPounds))
    
    // Validate response data
    const validatedDivisions = divisionResults.map(division => {
      const validated = divisionSelectSchema.parse(division)
      
      // Parse alternativeNames JSON string if it exists
      let alternativeNames: string[] | undefined
      if (validated.alternativeNames) {
        try {
          alternativeNames = JSON.parse(validated.alternativeNames)
        } catch {
          alternativeNames = undefined
        }
      }
      
      return {
        ...validated,
        alternativeNames
      }
    })
    
    // If stats are requested, get boxer counts for each division
    if (includeStats) {
      const divisionsWithStats = await Promise.all(
        validatedDivisions.map(async (division) => {
          const boxerCountResults = await db
            .select({ count: count() })
            .from(boxers)
            .where(eq(boxers.proDivision, division.slug))
          
          const boxerCount = boxerCountResults[0]?.count || 0
          
          return {
            ...division,
            stats: {
              totalBoxers: boxerCount
            }
          }
        })
      )
      
      return {
        divisions: divisionsWithStats,
        total: divisionsWithStats.length
      }
    }
    
    return {
      divisions: validatedDivisions,
      total: validatedDivisions.length
    }
    
  } catch (error) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to fetch divisions',
      data: error instanceof Error ? error.message : 'Unknown error'
    })
  }
})