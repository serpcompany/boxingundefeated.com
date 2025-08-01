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

export default defineTask({
  meta: {
    name: 'db:seed-all',
    description: 'Run all seeders: divisions, boxers, boxer-bouts'
  },
  async run() {
    return main()
  },
})