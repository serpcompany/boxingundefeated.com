// server/tasks/seed-all.ts
// Runs all seeders: divisions, boxers, boxer-bouts
import { seedDivisions } from './seed-divisions'
import { seedBoxers } from './seed-boxers'
import { seedBoxerBouts } from './seed-boxer-bouts'

// NuxtHub/Tasks: use global defineTask, do not import it!
export default defineTask({
  meta: {
    name: 'seed-all',
    description: 'Seed all tables (divisions, boxers, boxer bouts)'
  },
  async run() {
    console.log('Seeding divisions...')
    await seedDivisions()
    console.log('Seeding boxers...')
    await seedBoxers()
    console.log('Seeding boxer bouts...')
    await seedBoxerBouts()
    console.log('All seeding complete!')
    return {}
  }
})

// Allow running from CLI
if (require.main === module) {
  (async () => {
    console.log('Seeding divisions...')
    await seedDivisions()
    console.log('Seeding boxers...')
    await seedBoxers()
    console.log('Seeding boxer bouts...')
    await seedBoxerBouts()
    console.log('All seeding complete!')
    process.exit(0)
  })().catch((err) => {
    console.error(err)
    process.exit(1)
  })
}
