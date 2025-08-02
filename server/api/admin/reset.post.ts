import { defineEventHandler, createError, getHeader } from 'h3'
import { seedDivisions } from '../../tasks/seed-divisions'
import { seedBoxers } from '../../tasks/seed-boxers'
import { seedBoxerBouts } from '../../tasks/seed-boxer-bouts'

export default defineEventHandler(async (event) => {
  // Check if we're in a safe environment for resetting
  const isDevOrPreview = process.env.NODE_ENV !== 'production' || 
                        process.env.NUXT_HUB_ENV === 'preview'
  
  // Allow production reset only with special header
  const allowProduction = getHeader(event, 'x-allow-production-reset') === 'true'
  
  if (!isDevOrPreview && !allowProduction) {
    throw createError({
      statusCode: 403,
      statusMessage: 'Database reset is not allowed in production without explicit permission'
    })
  }

  try {
    const db = hubDatabase()
    
    console.log('Starting database reset...')
    
    // Drop all data from tables (in correct order due to foreign keys)
    console.log('Dropping all data from tables...')
    await db.exec('DELETE FROM boxerBouts;')
    await db.exec('DELETE FROM boxers;')
    await db.exec('DELETE FROM divisions;')
    
    console.log('All data dropped successfully')
    
    // Now reseed the database
    console.log('Starting reseeding...')
    
    const results = {
      divisions: { result: 'pending', count: 0, error: null },
      boxers: { result: 'pending', count: 0, error: null },
      boxerBouts: { result: 'pending', count: 0, error: null },
    }
    
    // Seed divisions
    console.log('Seeding divisions...')
    try {
      const divResult = await seedDivisions()
      results.divisions = { ...divResult, error: null }
      console.log('Divisions seeded:', results.divisions)
    } catch (error) {
      console.error('Failed to seed divisions:', error)
      results.divisions = { 
        result: 'error', 
        count: 0, 
        error: error instanceof Error ? error.message : String(error) 
      }
    }
    
    // Seed boxers
    console.log('Seeding boxers...')
    try {
      const boxerResult = await seedBoxers()
      results.boxers = { ...boxerResult, error: null }
      console.log('Boxers seeded:', results.boxers)
    } catch (error) {
      console.error('Failed to seed boxers:', error)
      results.boxers = { 
        result: 'error', 
        count: 0, 
        error: error instanceof Error ? error.message : String(error) 
      }
    }
    
    // Seed boxer bouts
    console.log('Seeding boxer bouts...')
    try {
      const boutResult = await seedBoxerBouts()
      results.boxerBouts = { ...boutResult, error: null }
      console.log('Boxer bouts seeded:', results.boxerBouts)
    } catch (error) {
      console.error('Failed to seed boxer bouts:', error)
      results.boxerBouts = { 
        result: 'error', 
        count: 0, 
        error: error instanceof Error ? error.message : String(error) 
      }
    }
    
    console.log('Database reset complete!')
    
    const hasErrors = Object.values(results).some(r => r.result === 'error')
    
    return {
      success: !hasErrors,
      message: hasErrors ? 'Database reset completed with errors' : 'Database reset completed successfully',
      environment: process.env.NUXT_HUB_ENV || 'development',
      results
    }
  } catch (error) {
    console.error('Error during reset:', error)
    
    throw createError({
      statusCode: 500,
      statusMessage: error instanceof Error ? error.message : 'Database reset failed'
    })
  }
})