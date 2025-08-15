import { tables, useDrizzle } from "../db/drizzle"
import boxers from "../seeds/boxers.json";
import divisions from "../seeds/divisions.json"

export default defineTask({
  meta: {
    name: 'db:seed',
    description: 'Run database seed task'
  },
  async run() {
    console.log('Running DB seed task...')

    const db = useDrizzle();

    const isBoxers = await db.$count(tables.boxers)

    if (!isBoxers) {
        for (const boxer of boxers) {
            await db.insert(tables.boxers).values(boxer)
        }

        console.log('Boxers table seeded')
    } else {
        console.log('Boxers table already seeded')
    }

    const isDivisions = await db.$count(tables.divisions)

    if (!isDivisions) {
        for (const division of divisions) {
            await db.insert(tables.divisions).values(division)
        }

        console.log('Divisions table seeded')
    } else {
        console.log('Divisions table already seeded')
    }

    return { result: 'success' }
  }
})
