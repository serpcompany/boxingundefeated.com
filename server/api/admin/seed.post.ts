import { defineEventHandler, createError } from 'h3'
import { seedDivisions } from '../../tasks/seed-divisions'
import { seedBoxers } from '../../tasks/seed-boxers'
import { seedBoxerBouts } from '../../tasks/seed-boxer-bouts'

export default defineEventHandler(async (event) => {
  // Check if we're in a safe environment for seeding
  const isDevOrPreview = process.env.NODE_ENV !== 'production' || 
                        process.env.NUXT_HUB_ENV === 'preview'
  
  if (!isDevOrPreview) {
    throw createError({
      statusCode: 403,
      statusMessage: 'Seeding is not allowed in production environment'
    })
  }

  try {
    console.log('Starting database seeding via API...')
    
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
    
    console.log('All seeding complete!')
    
    const hasErrors = Object.values(results).some(r => r.result === 'error')
    
    return {
      success: !hasErrors,
      message: hasErrors ? 'Database seeding completed with errors' : 'Database seeding completed successfully',
      results
    }
  } catch (error) {
    console.error('Error during seeding:', error)
    
    throw createError({
      statusCode: 500,
      statusMessage: error instanceof Error ? error.message : 'Database seeding failed'
    })
  }
})
