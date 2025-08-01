// Allow running directly from CLI (ESM compatible)
if (import.meta.url === `file://${process.argv[1]}`) {
  seedDivisions().then(console.log).catch((err) => {
    console.error(err)
    process.exit(1)
  })
}
// server/tasks/seed-divisions.ts
import { tables } from '../utils/drizzle'
import { drizzle } from 'drizzle-orm/better-sqlite3'
import Database from 'better-sqlite3'
import { sql } from 'drizzle-orm'

export async function seedDivisions() {
  console.log('Seeding divisions table…')

  // Use env or fallback to default path
  const dbPath = process.env.DRIZZLE_DB_URL || './.data/hub/d1/miniflare-D1DatabaseObject/7b8799eb95f0bb5448e259812996a461ce40142dacbdea254ea597e307767f45.sqlite'
  const sqlite = new Database(dbPath)
  const db = drizzle(sqlite, { schema: tables })

  const divisionsData = [
    { id: 'minimumweight', slug: 'minimumweight', name: 'Minimumweight', shortName: 'minimum', weightLimitPounds: 105, weightLimitKilograms: 47.627, weightLimitStone: '7st 7lbs', alternativeNames: JSON.stringify(['Mini Flyweight']) },
    { id: 'light-flyweight', slug: 'light-flyweight', name: 'Light Flyweight', shortName: 'light fly', weightLimitPounds: 108, weightLimitKilograms: 48.988, weightLimitStone: '7st 10lbs', alternativeNames: JSON.stringify(['Junior Flyweight']) },
    { id: 'flyweight', slug: 'flyweight', name: 'Flyweight', shortName: 'fly', weightLimitPounds: 112, weightLimitKilograms: 50.802, weightLimitStone: '8st', alternativeNames: undefined },
    { id: 'super-flyweight', slug: 'super-flyweight', name: 'Super Flyweight', shortName: 'super fly', weightLimitPounds: 115, weightLimitKilograms: 52.163, weightLimitStone: '8st 3lbs', alternativeNames: JSON.stringify(['Junior Bantamweight']) },
    { id: 'bantamweight', slug: 'bantamweight', name: 'Bantamweight', shortName: 'bantam', weightLimitPounds: 118, weightLimitKilograms: 53.525, weightLimitStone: '8st 6lbs', alternativeNames: undefined },
    { id: 'super-bantamweight', slug: 'super-bantamweight', name: 'Super Bantamweight', shortName: 'super bantam', weightLimitPounds: 122, weightLimitKilograms: 55.338, weightLimitStone: '8st 10lbs', alternativeNames: JSON.stringify(['Junior Featherweight']) },
    { id: 'featherweight', slug: 'featherweight', name: 'Featherweight', shortName: 'feather', weightLimitPounds: 126, weightLimitKilograms: 57.153, weightLimitStone: '9st', alternativeNames: undefined },
    { id: 'super-featherweight', slug: 'super-featherweight', name: 'Super Featherweight', shortName: 'super feather', weightLimitPounds: 130, weightLimitKilograms: 58.967, weightLimitStone: '9st 4lbs', alternativeNames: JSON.stringify(['Junior Lightweight']) },
    { id: 'lightweight', slug: 'lightweight', name: 'Lightweight', shortName: 'light', weightLimitPounds: 135, weightLimitKilograms: 61.235, weightLimitStone: '9st 9lbs', alternativeNames: undefined },
    { id: 'super-lightweight', slug: 'super-lightweight', name: 'Super Lightweight', shortName: 'super light', weightLimitPounds: 140, weightLimitKilograms: 63.503, weightLimitStone: '10st', alternativeNames: JSON.stringify(['Junior Welterweight']) },
    { id: 'welterweight', slug: 'welterweight', name: 'Welterweight', shortName: 'welter', weightLimitPounds: 147, weightLimitKilograms: 66.678, weightLimitStone: '10st 7lbs', alternativeNames: undefined },
    { id: 'super-welterweight', slug: 'super-welterweight', name: 'Super Welterweight', shortName: 'super welter', weightLimitPounds: 154, weightLimitKilograms: 69.85, weightLimitStone: '11st', alternativeNames: JSON.stringify(['Junior Middleweight']) },
    { id: 'middleweight', slug: 'middleweight', name: 'Middleweight', shortName: 'middle', weightLimitPounds: 160, weightLimitKilograms: 72.574, weightLimitStone: '11st 6lbs', alternativeNames: undefined },
    { id: 'super-middleweight', slug: 'super-middleweight', name: 'Super Middleweight', shortName: 'super middle', weightLimitPounds: 168, weightLimitKilograms: 76.203, weightLimitStone: '12st', alternativeNames: undefined },
    { id: 'light-heavyweight', slug: 'light-heavyweight', name: 'Light Heavyweight', shortName: 'light heavy', weightLimitPounds: 175, weightLimitKilograms: 79.378, weightLimitStone: '12st 7lbs', alternativeNames: undefined },
    { id: 'cruiserweight', slug: 'cruiserweight', name: 'Cruiserweight', shortName: 'cruiser', weightLimitPounds: 200, weightLimitKilograms: 90.718, weightLimitStone: '14st 4lbs', alternativeNames: JSON.stringify(['Junior Heavyweight']) },
    { id: 'heavyweight', slug: 'heavyweight', name: 'Heavyweight', shortName: 'heavy', weightLimitPounds: 201, weightLimitKilograms: 90.719, weightLimitStone: `14st 5lbs`, alternativeNames: undefined },
  ]

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

// Nuxt DevTools GUI support (uncomment for Nuxt DevTools, comment for CLI/tsx)
// export default defineTask({
//   meta: {
//     name: 'db:seed-divisions',
//     description: 'Populate the divisions table with boxing weight classes',
//   },
//   async run() {
//     return seedDivisions()
//   },
// })