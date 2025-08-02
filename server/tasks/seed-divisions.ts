import { useDrizzle, tables, sql } from '../utils/drizzle'
import { divisionsData } from '../database/seeds/divisions.data'

export async function seedDivisions() {
  console.log('Seeding divisions table…')

  const db = useDrizzle()

  let inserted = 0
  for (const division of divisionsData) {
    await db
      .insert(tables.divisions)
      .values(division)
      .onConflictDoUpdate({
        target: tables.divisions.id,
        set: {
          slug: sql`excluded.slug`,
          name: sql`excluded.name`,
          shortName: sql`excluded.shortName`,
          alternativeNames: sql`excluded.alternativeNames`,
          weightLimitPounds: sql`excluded.weightLimitPounds`,
          weightLimitKilograms: sql`excluded.weightLimitKilograms`,
          weightLimitStone: sql`excluded.weightLimitStone`,
          updatedAt: sql`CURRENT_TIMESTAMP`,
        },
      })
    inserted += 1
  }

  return { result: 'success', count: inserted }
}

export default defineTask({
  meta: {
    name: 'db:seed-divisions',
    description: 'Populate the divisions table with boxing weight classes',
  },
  async run() {
    return seedDivisions()
  },
})