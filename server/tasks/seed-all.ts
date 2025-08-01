export default defineTask({
  meta: {
    name: 'db:seed:all',
    description: 'Seed all database tables (divisions, boxers, and bouts)'
  },
  async run() {
    console.log('🌱 Starting complete database seed...')
    
    try {
      // Run divisions seed
      const divisionsTask = await runTask('db:seed:divisions')
      if (!divisionsTask.result?.success) {
        throw new Error('Failed to seed divisions')
      }
      
      // Run boxers seed
      const boxersTask = await runTask('db:seed:boxers')
      if (!boxersTask.result?.success) {
        throw new Error('Failed to seed boxers')
      }
      
      console.log(`
🎉 Complete database seed finished!
- Divisions: ${divisionsTask.result.count}
- Boxers: ${boxersTask.result.boxers}
- Fights: ${boxersTask.result.fights}
`)
      
      return {
        success: true,
        divisions: divisionsTask.result.count,
        boxers: boxersTask.result.boxers,
        fights: boxersTask.result.fights
      }
      
    } catch (error) {
      console.error('❌ Complete seed failed:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }
})