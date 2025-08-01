import { seedDivisions } from '../../tasks/seed-divisions'
import { seedBoxers } from '../../tasks/seed-boxers'
import { seedBoxerBouts } from '../../tasks/seed-boxer-bouts'

export default defineEventHandler(async (event) => {
  try {
    console.log('Starting database seeding via API...')
    
    const results = {
      divisions: { result: 'skipped', count: 0 },
      boxers: { result: 'skipped', count: 0 },
      boxerBouts: { result: 'skipped', count: 0 },
    }
    
    // Seed divisions
    console.log('Seeding divisions...')
    results.divisions = await seedDivisions()
    console.log('Divisions seeded:', results.divisions)
    
    // Seed boxers
    console.log('Seeding boxers...')
    results.boxers = await seedBoxers()
    console.log('Boxers seeded:', results.boxers)
    
    // Seed boxer bouts
    console.log('Seeding boxer bouts...')
    results.boxerBouts = await seedBoxerBouts()
    console.log('Boxer bouts seeded:', results.boxerBouts)
    
    console.log('All seeding complete!')
    
    return {
      success: true,
      message: 'Database seeding completed successfully',
      results
    }
  } catch (error) {
    console.error('Error during seeding:', error)
    
    return {
      success: false,
      message: 'Database seeding failed',
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
})
