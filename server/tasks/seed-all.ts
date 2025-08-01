// server/tasks/seed-all.ts
// Runs all seeders: divisions, boxers, boxer-bouts
import { seedDivisions } from './seed-divisions'
import { seedBoxers } from './seed-boxers'
import { seedBoxerBouts } from './seed-boxer-bouts'

async function main() {
  console.log('Seeding divisions...')
  await seedDivisions()
  console.log('Seeding boxers...')
  await seedBoxers()
  console.log('Seeding boxer bouts...')
  await seedBoxerBouts()
  console.log('All seeding complete!')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
