import { boxers, boxerBoutsTable } from '~/server/database/schema'
import boxersDataFile from '~/data/boxers.json'

export default defineEventHandler(async (event) => {
  try {
    const db = useDrizzle()
    
    // First clear existing data
    await db.delete(boxerBoutsTable)
    await db.delete(boxers)
    console.log('Cleared existing data')
    
    const boxerData = boxersDataFile.boxers
    console.log(`Loading ${boxerData.length} real boxers from boxers.json...`)
    
    let importedBoxers = 0
    let importedFights = 0
    let errors = []
    
    // Process each boxer
    for (const boxer of boxerData) {
      try {
        // Map JSON fields to database fields (now camelCase)
        const dbBoxer = {
          id: boxer.boxrec_id, // Use boxrec_id as primary key
          boxrecId: boxer.boxrec_id,
          boxrecUrl: boxer.boxrec_url,
          boxrecWikiUrl: null, // Not in this JSON
          slug: boxer.slug,
          name: boxer.name,
          birthName: boxer.birth_name || null,
          nicknames: boxer.alias || null,
          avatarImage: boxer.image || null,
          residence: null, // Not in this JSON
          birthPlace: boxer.birth_place || null,
          dateOfBirth: boxer.birth_date || null,
          gender: null, // Not in this JSON
          nationality: boxer.nationality || null,
          height: boxer.height || null,
          reach: boxer.reach || null,
          stance: boxer.stance || null,
          bio: boxer.biography || null,
          promoters: null, // Not in JSON
          trainers: null, // Not in JSON
          managers: null, // Not in JSON
          gym: null, // Not in JSON
          proDebutDate: null, // Not in this JSON
          proDivision: boxer.division || null,
          proWins: boxer.record?.wins || 0,
          proWinsByKnockout: boxer.record?.kos || 0,
          proLosses: boxer.record?.losses || 0,
          proLossesByKnockout: 0, // Not in this JSON
          proDraws: boxer.record?.draws || 0,
          proStatus: boxer.status || 'active',
          proTotalBouts: ((boxer.record?.wins || 0) + (boxer.record?.losses || 0) + (boxer.record?.draws || 0)),
          proTotalRounds: 0, // Not in this JSON
          amateurDebutDate: null, // Not in JSON
          amateurDivision: null, // Not in JSON
          amateurWins: 0, // Not in JSON
          amateurWinsByKnockout: 0, // Not in JSON
          amateurLosses: 0, // Not in JSON
          amateurLossesByKnockout: 0, // Not in JSON
          amateurDraws: 0, // Not in JSON
          amateurStatus: null, // Not in JSON
          amateurTotalBouts: 0, // Not in JSON
          amateurTotalRounds: 0, // Not in JSON
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }
        
        // Insert boxer
        await db.insert(boxers).values(dbBoxer)
        importedBoxers++
        
        // Import fights if available
        if (boxer.fights && Array.isArray(boxer.fights)) {
          for (const fight of boxer.fights) {
            try {
              const dbFight = {
                boxerId: boxer.id,
                boxrecId: null, // Not in JSON
                boutDate: fight.bout_date || '',
                opponentName: fight.opponent_name || '',
                opponentWeight: null, // Not in JSON
                opponentRecord: fight.opponent_record || null,
                eventName: fight.venue_name || null, // Using venue_name for eventName
                refereeName: null, // Not in JSON
                judge1Name: null, // Not in JSON
                judge1Score: null, // Not in JSON
                judge2Name: null, // Not in JSON
                judge2Score: null, // Not in JSON
                judge3Name: null, // Not in JSON
                judge3Score: null, // Not in JSON
                numRoundsScheduled: fight.num_rounds_scheduled || null,
                result: fight.result || '', // 'win' | 'loss' | 'draw' | 'no-contest'
                resultMethod: null, // Not in JSON
                resultRound: null, // Not in JSON
                eventPageLink: fight.event_page_link || null,
                boutPageLink: null, // Not in JSON
                scorecardsPageLink: null, // Not in JSON
                titleFight: fight.title_fight === true ? 1 : 0,
              }
              
              await db.insert(boxerBoutsTable).values(dbFight)
              importedFights++
            } catch (fightError) {
              console.error(`Error importing fight for ${boxer.full_name}:`, fightError)
            }
          }
        }
        
      } catch (boxerError) {
        console.error(`Error importing boxer ${boxer.full_name}:`, boxerError)
        errors.push({
          boxer: boxer.full_name,
          error: boxerError.message
        })
      }
    }
    
    return {
      success: true,
      imported: {
        boxers: importedBoxers,
        fights: importedFights
      },
      total: boxerData.length,
      errors: errors.length > 0 ? errors : undefined,
      message: `Successfully imported ${importedBoxers} boxers and ${importedFights} fights`
    }
    
  } catch (error) {
    console.error('Error seeding database:', error)
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to seed database',
      data: error instanceof Error ? error.message : 'Unknown error'
    })
  }
})