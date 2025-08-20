import { boxers } from '~/server/db/schema'
import { boxerSelectSchema } from '~/server/db/validation'
import { like, eq, and, desc, asc } from 'drizzle-orm'
import { z } from 'zod'
import { useDrizzle } from '~/server/db/drizzle'

// Query parameters validation schema
const boxersQuerySchema = z.object({
  search: z.string().optional(),
  nationality: z.string().optional(),
  division: z.string().optional(),
  status: z.enum(['active', 'inactive']).optional(),
  sortBy: z.enum(['name', 'wins', 'losses', 'ranking']).default('name'),
  sortOrder: z.enum(['asc', 'desc']).default('asc'),
  page: z.number().min(1).default(1),
  limit: z.number().min(1).max(100).default(20),
  skip: z.number().optional(),
})

export default defineEventHandler(async (event) => {
  try {
    const db = useDrizzle()
    const query = getQuery(event)

    // Validate and parse query parameters
    const {
      search,
      nationality,
      division,
      status,
      sortBy,
      sortOrder,
      page,
      limit,
      skip
    } = boxersQuerySchema.parse({
      ...query,
      page: query.page ? Number(query.page) : 1,
      limit: query.limit ? Number(query.limit) : 50,
      skip: query.skip ? Number(query.skip) : undefined,
    })

    // Build WHERE conditions
    const conditions = []

    if (search) {
      conditions.push(like(boxers.name, `%${search}%`))
    }

    if (nationality) {
      conditions.push(eq(boxers.nationality, nationality))
    }

    if (division) {
      conditions.push(eq(boxers.proDivision, division))
    }

    if (status) {
      conditions.push(eq(boxers.proStatus, status))
    }

    // Build ORDER BY clause
    const sortColumn = {
      name: boxers.name,
      wins: boxers.proWins,
      losses: boxers.proLosses,
      ranking: boxers.id, // Use id as fallback since ranking was removed
    }[sortBy]

    const orderFn = sortOrder === 'desc' ? desc : asc

    // Execute query with pagination
    let offset = (page - 1) * limit

    if (skip) {
        offset += skip
    }

    const results = await db
      .select()
      .from(boxers)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(orderFn(sortColumn))
      .limit(limit)
      .offset(offset)

    // Get total count for pagination
    const totalResults = await db
      .select({ count: boxers.id })
      .from(boxers)
      .where(conditions.length > 0 ? and(...conditions) : undefined)

    const total = totalResults.length
    const totalPages = Math.ceil(total / limit)

    // Validate response data - convert id to number if it's a string
    const validatedResults = results.map(boxer => {
      const boxerWithNumericId = {
        ...boxer,
        id: typeof boxer.id === 'string' ? parseInt(boxer.id, 10) : boxer.id
      }
      return boxerSelectSchema.parse(boxerWithNumericId)
    })

    return {
      boxers: validatedResults,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
      filters: {
        search,
        nationality,
        division,
        status,
        sortBy,
        sortOrder,
      }
    }

  } catch (error) {
    console.error('Error in /api/boxers:', error)
    throw createError({
      statusCode: 400,
      statusMessage: 'Invalid query parameters',
      data: error instanceof Error ? error.message : 'Unknown error'
    })
  }
})
