export default defineTask({
  meta: {
    name: 'db:seed:boxers',
    description: 'Seed the boxers and boxer bouts tables from JSON files'
  },
  async run() {
    const { useDrizzle } = await import('../../utils/drizzle')
    const { boxers, boxerBouts } = await import('../../database/schema')
    const { readdir, readFile } = await import('fs/promises')
    const { join } = await import('path')
    
    console.log('🥊 Starting boxers seed...')
    
    const db = useDrizzle()
    
    try {
      // Clear existing data
      await db.delete(boxerBouts)
      await db.delete(boxers)
      console.log('✅ Cleared existing boxer data')
      
      // Read all JSON files from the boxrec_json directory
      const boxrecJsonDir = join(process.cwd(), 'data', 'boxrec_json')
      const files = await readdir(boxrecJsonDir)
      const jsonFiles = files.filter(f => f.endsWith('.json'))
      
      console.log(`📁 Found ${jsonFiles.length} boxer JSON files to import...`)
      
      let importedBoxers = 0
      let importedFights = 0
      let skippedBoxers = 0
      const errors: Array<{ file: string; error: string }> = []
      const usedSlugs = new Map<string, number>()
      
      // Process each file
      for (const file of jsonFiles) {
        try {
          const filePath = join(boxrecJsonDir, file)
          const fileContent = await readFile(filePath, 'utf-8')
          const boxer = JSON.parse(fileContent)
          
          // Skip if no valid boxer data (e.g. login errors)
          if (!boxer.boxrecId || boxer.boxrecId === '' || !boxer.name || boxer.name === 'Login') {
            skippedBoxers++
            continue
          }
          
          // Convert numeric strings to numbers and handle empty strings
          const parseIntOrNull = (val: string | number | null | undefined): number | null => {
            if (val === '' || val === null || val === undefined) return null
            const parsed = parseInt(val.toString())
            return isNaN(parsed) ? null : parsed
          }
          
          // Handle duplicate slugs by appending boxrec ID
          let slug = boxer.slug
          if (usedSlugs.has(slug)) {
            slug = `${slug}-${boxer.boxrecId}`
          }
          usedSlugs.set(slug, 1)
          
          // Map JSON fields to database fields
          const dbBoxer = {
            id: boxer.boxrecId, // Use boxrecId as primary key
            boxrecId: boxer.boxrecId,
            boxrecUrl: boxer.boxrecUrl || null,
            boxrecWikiUrl: boxer.boxrecWikiUrl || null,
            slug: slug,
            name: boxer.name,
            birthName: boxer.birthName || null,
            nicknames: boxer.nicknames || null,
            avatarImage: boxer.avatarImage || null,
            residence: boxer.residence || null,
            birthPlace: boxer.birthPlace || null,
            dateOfBirth: boxer.dateOfBirth || null,
            gender: boxer.gender || null,
            nationality: boxer.nationality || null,
            height: boxer.height || null,
            reach: boxer.reach || null,
            stance: boxer.stance || null,
            bio: boxer.bio || null,
            promoters: boxer.promoters || null,
            trainers: boxer.trainers || null,
            managers: boxer.managers || null,
            gym: boxer.gym || null,
            proDebutDate: boxer.proDebutDate || null,
            proDivision: boxer.proDivision || null,
            proWins: parseIntOrNull(boxer.proWins) || 0,
            proWinsByKnockout: parseIntOrNull(boxer.proWinsByKnockout) || 0,
            proLosses: parseIntOrNull(boxer.proLosses) || 0,
            proLossesByKnockout: parseIntOrNull(boxer.proLossesByKnockout) || 0,
            proDraws: parseIntOrNull(boxer.proDraws) || 0,
            proStatus: boxer.proStatus || null,
            proTotalBouts: parseIntOrNull(boxer.proTotalBouts) || 0,
            proTotalRounds: parseIntOrNull(boxer.proTotalRounds) || 0,
            amateurDebutDate: boxer.amateurDebutDate || null,
            amateurDivision: boxer.amateurDivision || null,
            amateurWins: parseIntOrNull(boxer.amateurWins) || 0,
            amateurWinsByKnockout: parseIntOrNull(boxer.amateurWinsByKnockout) || 0,
            amateurLosses: parseIntOrNull(boxer.amateurLosses) || 0,
            amateurLossesByKnockout: parseIntOrNull(boxer.amateurLossesByKnockout) || 0,
            amateurDraws: parseIntOrNull(boxer.amateurDraws) || 0,
            amateurStatus: boxer.amateurStatus || null,
            amateurTotalBouts: parseIntOrNull(boxer.amateurTotalBouts) || 0,
            amateurTotalRounds: parseIntOrNull(boxer.amateurTotalRounds) || 0,
            createdAt: boxer.createdAt || new Date().toISOString(),
            updatedAt: boxer.updatedAt || new Date().toISOString(),
          }
          
          // Insert boxer
          await db.insert(boxers).values(dbBoxer)
          importedBoxers++
          
          // Import fights if available
          if (boxer.bouts && Array.isArray(boxer.bouts)) {
            for (const fight of boxer.bouts) {
              try {
                const dbFight = {
                  boxerId: boxer.boxrecId,
                  boxrecId: fight.boxrecId || null,
                  boutDate: fight.boutDate || '',
                  opponentName: fight.opponentName || '',
                  opponentWeight: fight.opponentWeight || null,
                  opponentRecord: fight.opponentRecord || null,
                  eventName: fight.eventName || fight.venueName || null,
                  refereeName: fight.refereeName || null,
                  judge1Name: fight.judge1Name || null,
                  judge1Score: fight.judge1Score || null,
                  judge2Name: fight.judge2Name || null,
                  judge2Score: fight.judge2Score || null,
                  judge3Name: fight.judge3Name || null,
                  judge3Score: fight.judge3Score || null,
                  numRoundsScheduled: parseIntOrNull(fight.numRoundsScheduled),
                  result: fight.result || '',
                  resultMethod: fight.resultMethod || null,
                  resultRound: parseIntOrNull(fight.resultRound),
                  eventPageLink: fight.eventPageLink || null,
                  boutPageLink: fight.boutPageLink || null,
                  scorecardsPageLink: fight.scorecardsPageLink || null,
                  titleFight: fight.titleFight === 'true' || fight.titleFight === true,
                }
                
                await db.insert(boxerBouts).values(dbFight)
                importedFights++
              } catch (fightError) {
                console.error(`Error importing fight for ${boxer.name}:`, fightError)
              }
            }
          }
          
          // Show progress every 50 boxers
          if (importedBoxers % 50 === 0) {
            console.log(`Progress: ${importedBoxers} boxers imported...`)
          }
          
        } catch (boxerError) {
          console.error(`Error importing boxer from ${file}:`, boxerError)
          errors.push({
            file,
            error: boxerError instanceof Error ? boxerError.message : 'Unknown error'
          })
        }
      }
      
      console.log(`
✅ Boxers seed completed!
- Boxers imported: ${importedBoxers}
- Fights imported: ${importedFights}
- Skipped files: ${skippedBoxers}
- Errors: ${errors.length}
`)
      
      if (errors.length > 0) {
        console.log('\n❌ Errors encountered:')
        errors.slice(0, 5).forEach(err => {
          console.log(`  - ${err.file}: ${err.error}`)
        })
        if (errors.length > 5) {
          console.log(`  ... and ${errors.length - 5} more errors`)
        }
      }
      
      return { 
        success: true, 
        boxers: importedBoxers, 
        fights: importedFights, 
        skipped: skippedBoxers,
        errors: errors.length 
      }
      
    } catch (error) {
      console.error('❌ Boxers seed failed:', error)
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }
    }
  }
})