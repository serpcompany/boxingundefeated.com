import { divisions, boxers } from '~/server/db/schema'
import { divisionSelectSchema } from '~/server/db/validation'
import { eq, count, asc } from 'drizzle-orm'
import { useDrizzle } from '~/server/db/drizzle'
import { setHeader } from 'h3'

export default defineEventHandler(async (event) => {
  try {
    setHeader(event, 'Cache-Control', 'public, max-age=0, s-maxage=600, stale-while-revalidate=60')

    const db = useDrizzle()
    const query = getQuery(event)

    // Get include_stats parameter
    const includeStats = query.include_stats === 'true'

    // Get all divisions ordered by weight limit (lightest to heaviest)
    const divisionResults = await db
      .select()
      .from(divisions)
      .orderBy(asc(divisions.weightLimitPounds))

    // Validate response data - handle SQLite returning string IDs
    const validatedDivisions = divisionResults.map((division, index) => {
      // Convert id to number if it's a string (SQLite issue)
      let id: any = division.id
      if (typeof id === 'string') {
        id = parseInt(id, 20)
      }
      // If id is NaN or null, assign a default id based on index
      if (isNaN(id) || id === null || id === undefined) {
        id = index + 1
      }

      const divisionWithNumericId = {
        ...division,
        id
      }
      const validated = divisionSelectSchema.parse(divisionWithNumericId)

      // Parse alternativeNames - could be JSON array or plain string
      let alternativeNames: string[] | undefined
      if (validated.alternativeNames) {
        // Handle if it's already an array
        if (Array.isArray(validated.alternativeNames)) {
          alternativeNames = validated.alternativeNames
        } else if (typeof validated.alternativeNames === 'string') {
          // Try to parse as JSON first
          try {
            alternativeNames = JSON.parse(validated.alternativeNames)
          } catch {
            // If not JSON, treat as a single alternative name
            alternativeNames = [validated.alternativeNames]
          }
        }
      }

      const result = {
        ...validated,
        alternativeNames
      }

      return result
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
