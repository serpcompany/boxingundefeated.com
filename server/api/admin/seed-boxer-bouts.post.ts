import { readFileSync } from 'fs'
import { join } from 'path'

export default defineEventHandler(async (event) => {
  // Add authentication in production!
  const isProduction = process.env.NODE_ENV === 'production'
  
  // For now, only allow in development or with a secret key
  const { secretKey } = await readBody(event) || {}
  if (isProduction && secretKey !== process.env.SEED_SECRET_KEY) {
    throw createError({
      statusCode: 403,
      statusMessage: 'Unauthorized'
    })
  }

  try {
    const db = useDrizzle()
    
    // In production, you'll need to upload the SQL file or use a different source
    // For local testing, read from file
    const sqlPath = join(process.cwd(), 'boxer-bouts-clean.sql')
    const sqlContent = readFileSync(sqlPath, 'utf-8')
    const statements = sqlContent.trim().split('\n')
    
    // Process in batches to avoid timeouts
    const batchSize = 1000
    let processed = 0
    
    for (let i = 0; i < statements.length; i += batchSize) {
      const batch = statements.slice(i, i + batchSize)
      
      // Execute each statement in the batch
      for (const statement of batch) {
        if (statement.trim()) {
          await db.run(statement)
        }
      }
      
      processed += batch.length
      
      // Add a small delay to prevent overwhelming the database
      if (i + batchSize < statements.length) {
        await new Promise(resolve => setTimeout(resolve, 100))
      }
    }
    
    return {
      success: true,
      message: `Successfully seeded ${processed} boxer bout records`
    }
  } catch (error) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to seed boxer bouts',
      data: error instanceof Error ? error.message : 'Unknown error'
    })
  }
})