export default defineTask({
  meta: {
    name: 'db:seed:divisions',
    description: 'Seed the divisions table with boxing weight classes'
  },
  async run() {
    const { useDrizzle } = await import('../../utils/drizzle')
    const { divisions } = await import('../../database/schema')
    
    console.log('🥊 Starting divisions seed...')
    
    const db = useDrizzle()
    
    try {
      // Clear existing divisions
      await db.delete(divisions)
      console.log('✅ Cleared existing divisions')
      
      const divisionsData = [
        { id: 'minimumweight', slug: 'minimumweight', name: 'Minimumweight', weightLimitPounds: 105, weightLimitKilograms: 47.627, weightLimitStone: '7st 7lbs', alternativeNames: JSON.stringify(['Mini Flyweight']) },
        { id: 'light-flyweight', slug: 'light-flyweight', name: 'Light Flyweight', weightLimitPounds: 108, weightLimitKilograms: 48.988, weightLimitStone: '7st 10lbs', alternativeNames: JSON.stringify(['Junior Flyweight']) },
        { id: 'flyweight', slug: 'flyweight', name: 'Flyweight', weightLimitPounds: 112, weightLimitKilograms: 50.802, weightLimitStone: '8st', alternativeNames: null },
        { id: 'super-flyweight', slug: 'super-flyweight', name: 'Super Flyweight', weightLimitPounds: 115, weightLimitKilograms: 52.163, weightLimitStone: '8st 3lbs', alternativeNames: JSON.stringify(['Junior Bantamweight']) },
        { id: 'bantamweight', slug: 'bantamweight', name: 'Bantamweight', weightLimitPounds: 118, weightLimitKilograms: 53.525, weightLimitStone: '8st 6lbs', alternativeNames: null },
        { id: 'super-bantamweight', slug: 'super-bantamweight', name: 'Super Bantamweight', weightLimitPounds: 122, weightLimitKilograms: 55.338, weightLimitStone: '8st 10lbs', alternativeNames: JSON.stringify(['Junior Featherweight']) },
        { id: 'featherweight', slug: 'featherweight', name: 'Featherweight', weightLimitPounds: 126, weightLimitKilograms: 57.153, weightLimitStone: '9st', alternativeNames: null },
        { id: 'super-featherweight', slug: 'super-featherweight', name: 'Super Featherweight', weightLimitPounds: 130, weightLimitKilograms: 58.967, weightLimitStone: '9st 4lbs', alternativeNames: JSON.stringify(['Junior Lightweight']) },
        { id: 'lightweight', slug: 'lightweight', name: 'Lightweight', weightLimitPounds: 135, weightLimitKilograms: 61.235, weightLimitStone: '9st 9lbs', alternativeNames: null },
        { id: 'super-lightweight', slug: 'super-lightweight', name: 'Super Lightweight', weightLimitPounds: 140, weightLimitKilograms: 63.503, weightLimitStone: '10st', alternativeNames: JSON.stringify(['Junior Welterweight']) },
        { id: 'welterweight', slug: 'welterweight', name: 'Welterweight', weightLimitPounds: 147, weightLimitKilograms: 66.678, weightLimitStone: '10st 7lbs', alternativeNames: null },
        { id: 'super-welterweight', slug: 'super-welterweight', name: 'Super Welterweight', weightLimitPounds: 154, weightLimitKilograms: 69.85, weightLimitStone: '11st', alternativeNames: JSON.stringify(['Junior Middleweight']) },
        { id: 'middleweight', slug: 'middleweight', name: 'Middleweight', weightLimitPounds: 160, weightLimitKilograms: 72.574, weightLimitStone: '11st 6lbs', alternativeNames: null },
        { id: 'super-middleweight', slug: 'super-middleweight', name: 'Super Middleweight', weightLimitPounds: 168, weightLimitKilograms: 76.203, weightLimitStone: '12st', alternativeNames: null },
        { id: 'light-heavyweight', slug: 'light-heavyweight', name: 'Light Heavyweight', weightLimitPounds: 175, weightLimitKilograms: 79.378, weightLimitStone: '12st 7lbs', alternativeNames: null },
        { id: 'cruiserweight', slug: 'cruiserweight', name: 'Cruiserweight', weightLimitPounds: 200, weightLimitKilograms: 90.718, weightLimitStone: '14st 4lbs', alternativeNames: JSON.stringify(['Junior Heavyweight']) },
        { id: 'heavyweight', slug: 'heavyweight', name: 'Heavyweight', weightLimitPounds: 999, weightLimitKilograms: 453.592, weightLimitStone: null, alternativeNames: null },
      ]
      
      await db.insert(divisions).values(divisionsData)
      
      console.log(`✅ Successfully seeded ${divisionsData.length} divisions`)
      
      return { 
        success: true, 
        count: divisionsData.length
      }
      
    } catch (error) {
      console.error('❌ Divisions seed failed:', error)
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }
    }
  }
})