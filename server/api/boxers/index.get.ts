import { boxers } from '~/server/database/schema'
import { boxerSelectSchema } from '~/server/database/validation'
import { like, eq, and, desc, asc } from 'drizzle-orm'
import { z } from 'zod'

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
      limit
    } = boxersQuerySchema.parse({
      ...query,
      page: query.page ? Number(query.page) : 1,
      limit: query.limit ? Number(query.limit) : 20,
    })
    
    // Build WHERE conditions
    const conditions = []
    
    if (search) {
      conditions.push(like(boxers.fullName, `%${search}%`))
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
      name: boxers.fullName,
      wins: boxers.proWins,
      losses: boxers.proLosses,
      ranking: boxers.ranking,
    }[sortBy]
    
    const orderFn = sortOrder === 'desc' ? desc : asc
    
    // Execute query with pagination
    const offset = (page - 1) * limit
    
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
    
    // Validate response data
    const validatedResults = results.map(boxer => boxerSelectSchema.parse(boxer))
    
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
    throw createError({
      statusCode: 400,
      statusMessage: 'Invalid query parameters',
      data: error instanceof Error ? error.message : 'Unknown error'
    })
  }
})