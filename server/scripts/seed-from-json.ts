import { promises as fs } from 'fs'
import { join } from 'path'

// First, let's create the divisions data
const divisionsData = [
  { id: 'minimumweight', slug: 'minimumweight', name: 'Minimumweight', weightLimitPounds: 105, weightLimitKilograms: 47.627, weightLimitStone: '7st 7lbs', alternativeNames: '["Mini Flyweight"]' },
  { id: 'light-flyweight', slug: 'light-flyweight', name: 'Light Flyweight', weightLimitPounds: 108, weightLimitKilograms: 48.988, weightLimitStone: '7st 10lbs', alternativeNames: '["Junior Flyweight"]' },
  { id: 'flyweight', slug: 'flyweight', name: 'Flyweight', weightLimitPounds: 112, weightLimitKilograms: 50.802, weightLimitStone: '8st', alternativeNames: null },
  { id: 'super-flyweight', slug: 'super-flyweight', name: 'Super Flyweight', weightLimitPounds: 115, weightLimitKilograms: 52.163, weightLimitStone: '8st 3lbs', alternativeNames: '["Junior Bantamweight"]' },
  { id: 'bantamweight', slug: 'bantamweight', name: 'Bantamweight', weightLimitPounds: 118, weightLimitKilograms: 53.525, weightLimitStone: '8st 6lbs', alternativeNames: null },
  { id: 'super-bantamweight', slug: 'super-bantamweight', name: 'Super Bantamweight', weightLimitPounds: 122, weightLimitKilograms: 55.338, weightLimitStone: '8st 10lbs', alternativeNames: '["Junior Featherweight"]' },
  { id: 'featherweight', slug: 'featherweight', name: 'Featherweight', weightLimitPounds: 126, weightLimitKilograms: 57.153, weightLimitStone: '9st', alternativeNames: null },
  { id: 'super-featherweight', slug: 'super-featherweight', name: 'Super Featherweight', weightLimitPounds: 130, weightLimitKilograms: 58.967, weightLimitStone: '9st 4lbs', alternativeNames: '["Junior Lightweight"]' },
  { id: 'lightweight', slug: 'lightweight', name: 'Lightweight', weightLimitPounds: 135, weightLimitKilograms: 61.235, weightLimitStone: '9st 9lbs', alternativeNames: null },
  { id: 'super-lightweight', slug: 'super-lightweight', name: 'Super Lightweight', weightLimitPounds: 140, weightLimitKilograms: 63.503, weightLimitStone: '10st', alternativeNames: '["Junior Welterweight"]' },
  { id: 'welterweight', slug: 'welterweight', name: 'Welterweight', weightLimitPounds: 147, weightLimitKilograms: 66.678, weightLimitStone: '10st 7lbs', alternativeNames: null },
  { id: 'super-welterweight', slug: 'super-welterweight', name: 'Super Welterweight', weightLimitPounds: 154, weightLimitKilograms: 69.85, weightLimitStone: '11st', alternativeNames: '["Junior Middleweight"]' },
  { id: 'middleweight', slug: 'middleweight', name: 'Middleweight', weightLimitPounds: 160, weightLimitKilograms: 72.574, weightLimitStone: '11st 6lbs', alternativeNames: null },
  { id: 'super-middleweight', slug: 'super-middleweight', name: 'Super Middleweight', weightLimitPounds: 168, weightLimitKilograms: 76.203, weightLimitStone: '12st', alternativeNames: null },
  { id: 'light-heavyweight', slug: 'light-heavyweight', name: 'Light Heavyweight', weightLimitPounds: 175, weightLimitKilograms: 79.378, weightLimitStone: '12st 7lbs', alternativeNames: null },
  { id: 'cruiserweight', slug: 'cruiserweight', name: 'Cruiserweight', weightLimitPounds: 200, weightLimitKilograms: 90.718, weightLimitStone: '14st 4lbs', alternativeNames: '["Junior Heavyweight"]' },
  { id: 'heavyweight', slug: 'heavyweight', name: 'Heavyweight', weightLimitPounds: 201, weightLimitKilograms: 90.719, weightLimitStone: '14st 5lbs', alternativeNames: null }
]

async function seedDatabase() {
  const dataDir = join(process.cwd(), 'data/boxrec_json')
  
  // Load D1 database
  const db = hubDatabase()
  
  // Clear existing data
  console.log('Clearing existing data...')
  await db.exec('DELETE FROM boxerBouts;')
  await db.exec('DELETE FROM boxers;')
  await db.exec('DELETE FROM divisions;')
  
  // Seed divisions
  console.log('Seeding divisions...')
  for (const division of divisionsData) {
    await db.prepare(`
      INSERT INTO divisions (id, slug, name, weightLimitPounds, weightLimitKilograms, weightLimitStone, alternativeNames)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).bind(
      division.id,
      division.slug,
      division.name,
      division.weightLimitPounds,
      division.weightLimitKilograms,
      division.weightLimitStone,
      division.alternativeNames
    ).run()
  }
  console.log(`Seeded ${divisionsData.length} divisions`)
  
  // Seed boxers from JSON files
  console.log('Seeding boxers...')
  const files = await fs.readdir(dataDir)
  const jsonFiles = files.filter(f => f.endsWith('.json') && !f.includes('_extracted'))
  
  let boxerCount = 0
  let boutCount = 0
  
  for (const file of jsonFiles) {
    const content = await fs.readFile(join(dataDir, file), 'utf-8')
    const data = JSON.parse(content)
    
    // Create boxer record
    const boxerId = data.boxrecId.toString().padStart(6, '0')
    
    await db.prepare(`
      INSERT OR REPLACE INTO boxers (
        id, boxrecId, boxrecUrl, boxrecWikiUrl, slug, name, 
        birthName, nicknames, avatarImage, residence, birthPlace, 
        dateOfBirth, gender, nationality, height, reach, stance, 
        bio, promoters, trainers, managers, gym, proDebutDate, 
        proDivision, proWins, proWinsByKnockout, proLosses, 
        proLossesByKnockout, proDraws, proStatus, proTotalBouts, 
        proTotalRounds, amateurDebutDate, amateurDivision, 
        amateurWins, amateurWinsByKnockout, amateurLosses, 
        amateurLossesByKnockout, amateurDraws, amateurStatus, 
        amateurTotalBouts, amateurTotalRounds
      ) VALUES (
        ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
      )
    `).bind(
      boxerId,
      data.boxrecId,
      data.boxrecUrl,
      data.boxrecWikiUrl || null,
      data.slug,
      data.name,
      data.birthName || null,
      data.nicknames || null,
      data.avatarImage || null,
      data.residence || null,
      data.birthPlace || null,
      data.dateOfBirth || null,
      data.gender || null,
      data.nationality || null,
      data.height ? String(data.height) : null,
      data.reach ? String(data.reach) : null,
      data.stance || null,
      data.bio || null,
      data.promoters || null,
      data.trainers || null,
      data.managers || null,
      data.gym || null,
      data.proDebutDate || null,
      data.proDivision || null,
      data.proWins || 0,
      data.proWinsByKnockout || 0,
      data.proLosses || 0,
      data.proLossesByKnockout || 0,
      data.proDraws || 0,
      data.proStatus || null,
      data.proTotalBouts || 0,
      data.proTotalRounds || 0,
      data.amateurDebutDate || null,
      data.amateurDivision || null,
      data.amateurWins || 0,
      data.amateurWinsByKnockout || 0,
      data.amateurLosses || 0,
      data.amateurLossesByKnockout || 0,
      data.amateurDraws || 0,
      data.amateurStatus || null,
      data.amateurTotalBouts || 0,
      data.amateurTotalRounds || 0
    ).run()
    
    boxerCount++
    
    // Insert bouts if available
    if (data.bouts && Array.isArray(data.bouts)) {
      for (const bout of data.bouts) {
        await db.prepare(`
          INSERT INTO boxerBouts (
            boxerId, boxrecId, boutDate, opponentName, opponentWeight,
            opponentRecord, eventName, refereeName, judge1Name, judge1Score,
            judge2Name, judge2Score, judge3Name, judge3Score, numRoundsScheduled,
            result, resultMethod, resultRound, eventPageLink, boutPageLink,
            scorecardsPageLink, titleFight
          ) VALUES (
            ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
          )
        `).bind(
          boxerId,
          bout.boxrecId || null,
          bout.boutDate,
          bout.opponentName,
          bout.opponentWeight || null,
          bout.opponentRecord || null,
          bout.eventName || null,
          bout.refereeName || null,
          bout.judge1Name || null,
          bout.judge1Score || null,
          bout.judge2Name || null,
          bout.judge2Score || null,
          bout.judge3Name || null,
          bout.judge3Score || null,
          bout.numRoundsScheduled || null,
          bout.result,
          bout.resultMethod || null,
          bout.resultRound || null,
          bout.eventPageLink || null,
          bout.boutPageLink || null,
          bout.scorecardsPageLink || null,
          bout.titleFight ? 1 : 0
        ).run()
        
        boutCount++
      }
    }
    
    if (boxerCount % 100 === 0) {
      console.log(`Processed ${boxerCount} boxers...`)
    }
  }
  
  console.log(`\nSeeding complete!`)
  console.log(`- Divisions: ${divisionsData.length}`)
  console.log(`- Boxers: ${boxerCount}`)
  console.log(`- Bouts: ${boutCount}`)
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  seedDatabase().catch(console.error)
}

export { seedDatabase }