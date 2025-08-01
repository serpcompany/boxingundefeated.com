import { runTask } from 'nitropack/runtime';

interface TaskResult {
  success: boolean;
  count?: number;
  boxers?: number;
  fights?: number;
  error?: string;
}

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
      const divisionsResult = divisionsTask.result as TaskResult
      if (!divisionsResult.success) {
        throw new Error('Failed to seed divisions')
      }
      
      // Run boxers seed
      const boxersTask = await runTask('db:seed:boxers')
      const boxersResult = boxersTask.result as TaskResult
      if (!boxersResult.success) {
        throw new Error('Failed to seed boxers')
      }
      
      console.log(`
🎉 Complete database seed finished!
- Divisions: ${divisionsResult.count}
- Boxers: ${boxersResult.boxers}
- Fights: ${boxersResult.fights}
`)
      
      return {
        result: {
          success: true,
          divisions: divisionsResult.count,
          boxers: boxersResult.boxers,
          fights: boxersResult.fights,
          error: undefined as string | undefined
        }
      }
      
    } catch (error) {
      console.error('❌ Complete seed failed:', error)
      return {
        result: {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
          divisions: 0,
          boxers: 0,
          fights: 0
        }
      }
    }
  }
})