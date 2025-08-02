import { defineEventHandler, createError } from 'h3'
import { useDrizzle, sql } from '../../utils/drizzle'
import { readFileSync } from 'fs'
import { join } from 'path'

export default defineEventHandler(async (event) => {
  // Require secret key for production seeding
  const { secretKey, migrationFile } = await readBody(event) || {}
  
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
    // List of migration files to execute
    const migrationFiles = migrationFile ? [migrationFile] : [
      '0004_seed-initial-data.sql', // Divisions
      '0005_seed-boxers-part1.sql',
      '0006_seed-boxers-part2.sql',
      '0007_seed-boxers-part3.sql',
      '0008_seed-boxers-part4.sql',
      '0009_seed-boxers-part5.sql',
      '0010_seed-boxers-part6.sql',
      '0011_seed-boxers-part7.sql',
      '0012_seed-boxers-part8.sql',
      '0013_seed-boxers-part9.sql',
      '0014_seed-boxers-part10.sql',
      '0015_seed-boxers-part11.sql'
    ]

    const results = []
    
    for (const file of migrationFiles) {
      try {
        console.log(`Executing migration: ${file}`)
        
        // Read the SQL file
        const sqlPath = join(process.cwd(), 'server/database/migrations', file)
        const sqlContent = readFileSync(sqlPath, 'utf-8')
        
        // Parse and execute SQL statements
        const statements = sqlContent
          .split(';')
          .map(s => s.trim())
          .filter(s => s.length > 0)
        
        let executed = 0
        for (const statement of statements) {
          try {
            await db.run(sql.raw(statement))
            executed++
          } catch (err) {
            console.error(`Failed to execute statement in ${file}:`, err)
          }
        }
        
        results.push({
          file,
          success: true,
          statementsExecuted: executed
        })
        
      } catch (error) {
        console.error(`Failed to process ${file}:`, error)
        results.push({
          file,
          success: false,
          error: error instanceof Error ? error.message : String(error)
        })
      }
    }

    const allSuccess = results.every(r => r.success)
    
    return {
      success: allSuccess,
      message: allSuccess 
        ? 'All migrations executed successfully' 
        : 'Some migrations failed',
      results
    }
    
  } catch (error) {
    console.error('Unexpected error during seeding:', error)
    throw createError({
      statusCode: 500,
      statusMessage: 'Unexpected error during SQL seeding',
      data: error instanceof Error ? error.message : 'Unknown error'
    })
  }
})