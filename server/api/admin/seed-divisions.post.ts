import { defineEventHandler, createError } from 'h3'
import { useDrizzle, tables, sql } from '../../utils/drizzle'
import { divisionsData } from '../../database/seeds/divisions.data'

export default defineEventHandler(async (event) => {
  // Require secret key for production seeding
  const { secretKey } = await readBody(event) || {}
  
  // Validate secret key
  const expectedKey = process.env.SEED_SECRET_KEY || 'default-dev-key'
  if (secretKey !== expectedKey) {
    throw createError({
      statusCode: 403,
      statusMessage: 'Invalid secret key'
    })
  }

  const db = useDrizzle()

  try {
    // Check if divisions already exist
    const existingDivisions = await db.select().from(tables.divisions)
    
    if (existingDivisions.length > 0) {
      return {
        success: true,
        message: `Divisions already seeded. Found ${existingDivisions.length} divisions.`,
        count: existingDivisions.length
      }
    }

    // Seed divisions
    console.log('Seeding divisions...')
    let inserted = 0
    
    for (const division of divisionsData) {
      await db
        .insert(tables.divisions)
        .values(division)
        .onConflictDoUpdate({
          target: tables.divisions.id,
          set: {
            slug: sql`excluded.slug`,
            name: sql`excluded.name`,
            shortName: sql`excluded.shortName`,
            alternativeNames: sql`excluded.alternativeNames`,
            weightLimitPounds: sql`excluded.weightLimitPounds`,
            weightLimitKilograms: sql`excluded.weightLimitKilograms`,
            weightLimitStone: sql`excluded.weightLimitStone`,
            updatedAt: sql`CURRENT_TIMESTAMP`,
          },
        })
      inserted++
    }

    return {
      success: true,
      message: `Successfully seeded ${inserted} divisions`,
      count: inserted
    }
    
  } catch (error) {
    console.error('Failed to seed divisions:', error)
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to seed divisions',
      data: error instanceof Error ? error.message : 'Unknown error'
    })
  }
})