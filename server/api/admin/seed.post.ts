export default defineEventHandler(async (event) => {
  try {
    const { useDrizzle } = await import('../../utils/drizzle')
    const { seedAll } = await import('../../database/seeds')
    
    const db = useDrizzle()
    
    // Get query parameters for options
    const query = getQuery(event)
    const boxerLimit = query.limit ? parseInt(query.limit as string) : 10 // Default to 10 for testing
    
    const result = await seedAll(db, { boxerLimit })
    
    return result
    
  } catch (error) {
    console.error('❌ Seed failed:', error)
    throw createError({
      statusCode: 500,
      statusMessage: 'Seed operation failed',
      data: error instanceof Error ? error.message : 'Unknown error'
    })
  }
})