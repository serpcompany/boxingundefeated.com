import { useDrizzle, tables, sql } from '../utils/drizzle'

// Import the seeding logic directly from the seed files
async function seedDivisions() {
  console.log('Seeding divisions table…')
  
  const db = useDrizzle()

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
    { id: 'heavyweight', slug: 'heavyweight', name: 'Heavyweight', shortName: 'heavy', weightLimitPounds: 201, weightLimitKilograms: 90.719, weightLimitStone: '14st 5lbs', alternativeNames: undefined },
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

async function seedBoxers() {
  console.log('Seeding boxers table…')
  // Add boxer seeding logic here if needed
  return { result: 'success', count: 0 }
}

async function seedBoxerBouts() {
  console.log('Seeding boxer bouts table…')
  // Add boxer bouts seeding logic here if needed
  return { result: 'success', count: 0 }
}

async function main() {
  try {
    console.log('Starting database seeding...')
    
    console.log('Seeding divisions...')
    const divisionsResult = await seedDivisions()
    console.log('Divisions seeded:', divisionsResult)
    
    console.log('Seeding boxers...')
    const boxersResult = await seedBoxers()
    console.log('Boxers seeded:', boxersResult)
    
    console.log('Seeding boxer bouts...')
    const boutsResult = await seedBoxerBouts()
    console.log('Boxer bouts seeded:', boutsResult)
    
    console.log('All seeding complete!')
  } catch (error) {
    console.error('Error during seeding:', error)
    process.exit(1)
  }
}

main()
