export default defineEventHandler(async (event) => {
  // Simple auth check - in production use proper auth
  const { authorization } = getHeaders(event)
  const { statements, secret } = await readBody(event)
  
  // For production, use environment variable
  const IMPORT_SECRET = process.env.IMPORT_SECRET || 'temporary-secret-change-me'
  
  if (secret !== IMPORT_SECRET && authorization !== `Bearer ${IMPORT_SECRET}`) {
    throw createError({
      statusCode: 403,
      statusMessage: 'Unauthorized'
    })
  }

  if (!statements || !Array.isArray(statements)) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Invalid request body - expected { statements: string[] }'
    })
  }

  try {
    const db = useDrizzle()
    let successCount = 0
    let errorCount = 0
    const errors: any[] = []

    // Process in smaller batches to avoid timeouts
    const batchSize = 100
    for (let i = 0; i < statements.length; i += batchSize) {
      const batch = statements.slice(i, i + batchSize)
      
      // Process each statement
      for (const statement of batch) {
        try {
          if (statement.trim()) {
            await db.run(statement)
            successCount++
          }
        } catch (error) {
          errorCount++
          errors.push({
            statement: statement.substring(0, 100) + '...',
            error: error instanceof Error ? error.message : 'Unknown error'
          })
        }
      }
      
      // Small delay between batches
      if (i + batchSize < statements.length) {
        await new Promise(resolve => setTimeout(resolve, 50))
      }
    }

    return {
      success: true,
      total: statements.length,
      successCount,
      errorCount,
      errors: errors.slice(0, 10), // Return first 10 errors
      message: `Processed ${successCount} statements successfully`
    }
  } catch (error) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Import failed',
      data: error instanceof Error ? error.message : 'Unknown error'
    })
  }
})