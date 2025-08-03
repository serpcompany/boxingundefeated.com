import { defineTask } from "nitro/runtime";

export default defineTask({
  meta: {
    name: 'db:reset',
    description: 'Drop all data and reseed the database'
  },
  async run({ event }: { event: any }) {
    const db = useD1Database()
    
    console.log('Dropping all data from tables...')
    
    // Delete all data from tables (in correct order due to foreign keys)
    await db.exec('DELETE FROM boxerBouts;')
    await db.exec('DELETE FROM boxers;')
    await db.exec('DELETE FROM divisions;')
    
    console.log('All data dropped successfully')
    
    // Now run the seed-all task
    console.log('Starting reseeding...')
    const seedTask = await runTask('db:seed-all')
    
    return {
      success: true,
      message: 'Database reset and reseeded successfully',
      seedResult: seedTask
    }
  },
})