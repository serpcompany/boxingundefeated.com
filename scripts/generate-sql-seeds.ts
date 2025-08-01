import { promises as fs } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const dataDir = join(__dirname, '../../data/boxrec_json')

async function generateBoxersSeed() {
  console.log('🥊 Generating boxers seed SQL...')
  
  const files = await fs.readdir(dataDir)
  const boxersInserts = []
  
  for (const file of files) {
    if (!file.endsWith('.json')) continue
    
    try {
      const content = await fs.readFile(join(dataDir, file), 'utf-8')
      const boxer = JSON.parse(content)
      
      let finalSlug = boxer.slug
      
      // Handle potential duplicate slugs
      if (boxer.boxrecId) {
        finalSlug = `${boxer.slug}-${boxer.boxrecId}`
      }
      
      const escapeSql = (str) => {
        if (!str) return 'NULL'
        return `'${str.replace(/'/g, "''")}'`
      }
      
      const valueOrNull = (val) => {
        if (val === null || val === undefined || val === '') return 'NULL'
        if (typeof val === 'number') return val
        return escapeSql(val)
      }
      
      const insert = `INSERT OR REPLACE INTO boxers (
        id, boxrecId, boxrecUrl, boxrecWikiUrl, slug, name, birthName, nicknames, 
        avatarImage, residence, birthPlace, dateOfBirth, gender, nationality, 
        height, reach, stance, bio, promoters, trainers, managers, gym,
        proDebutDate, proDivision, proWins, proWinsByKnockout, proLosses, 
        proLossesByKnockout, proDraws, proStatus, proTotalBouts, proTotalRounds,
        amateurDebutDate, amateurDivision, amateurWins, amateurWinsByKnockout, 
        amateurLosses, amateurLossesByKnockout, amateurDraws, amateurStatus, 
        amateurTotalBouts, amateurTotalRounds
      ) VALUES (
        ${escapeSql(boxer.boxrecId?.toString().padStart(6, '0') || '')},
        ${valueOrNull(boxer.boxrecId)},
        ${valueOrNull(boxer.boxrecUrl)},
        ${valueOrNull(boxer.boxrecWikiUrl)},
        ${escapeSql(finalSlug)},
        ${valueOrNull(boxer.name)},
        ${valueOrNull(boxer.birthName)},
        ${valueOrNull(boxer.nicknames)},
        ${valueOrNull(boxer.avatarImage)},
        ${valueOrNull(boxer.residence)},
        ${valueOrNull(boxer.birthPlace)},
        ${valueOrNull(boxer.dateOfBirth)},
        ${valueOrNull(boxer.gender)},
        ${valueOrNull(boxer.nationality)},
        ${valueOrNull(boxer.height)},
        ${valueOrNull(boxer.reach)},
        ${valueOrNull(boxer.stance)},
        ${valueOrNull(boxer.bio)},
        ${valueOrNull(boxer.promoters)},
        ${valueOrNull(boxer.trainers)},
        ${valueOrNull(boxer.managers)},
        ${valueOrNull(boxer.gym)},
        ${valueOrNull(boxer.proDebutDate)},
        ${valueOrNull(boxer.proDivision)},
        ${valueOrNull(boxer.proWins)},
        ${valueOrNull(boxer.proWinsByKnockout)},
        ${valueOrNull(boxer.proLosses)},
        ${valueOrNull(boxer.proLossesByKnockout)},
        ${valueOrNull(boxer.proDraws)},
        ${valueOrNull(boxer.proStatus)},
        ${valueOrNull(boxer.proTotalBouts)},
        ${valueOrNull(boxer.proTotalRounds)},
        ${valueOrNull(boxer.amateurDebutDate)},
        ${valueOrNull(boxer.amateurDivision)},
        ${valueOrNull(boxer.amateurWins)},
        ${valueOrNull(boxer.amateurWinsByKnockout)},
        ${valueOrNull(boxer.amateurLosses)},
        ${valueOrNull(boxer.amateurLossesByKnockout)},
        ${valueOrNull(boxer.amateurDraws)},
        ${valueOrNull(boxer.amateurStatus)},
        ${valueOrNull(boxer.amateurTotalBouts)},
        ${valueOrNull(boxer.amateurTotalRounds)}
      );`
      
      boxersInserts.push(insert)
      
    } catch (error) {
      console.warn(`Failed to process ${file}:`, error.message)
    }
  }
  
  const sql = `-- Seed boxers data\n${boxersInserts.join('\n\n')}`
  await fs.writeFile('seed-boxers.sql', sql)
  console.log(`✅ Generated seed-boxers.sql with ${boxersInserts.length} boxers`)
}

async function generateBoxerBoutsSeed() {
  console.log('🥊 Generating boxer bouts seed SQL...')
  
  const files = await fs.readdir(dataDir)
  const boutsInserts = []
  
  for (const file of files) {
    if (!file.endsWith('.json')) continue
    
    try {
      const content = await fs.readFile(join(dataDir, file), 'utf-8')
      const data = JSON.parse(content)
      const boxerId = data.boxrecId?.toString().padStart(6, '0')
      const bouts = Array.isArray(data.bouts) ? data.bouts : []
      
      for (const bout of bouts) {
        const escapeSql = (str) => {
          if (!str) return 'NULL'
          return `'${str.replace(/'/g, "''")}'`
        }
        
        const valueOrNull = (val) => {
          if (val === null || val === undefined || val === '') return 'NULL'
          if (typeof val === 'number') return val
          if (typeof val === 'boolean') return val ? 1 : 0
          return escapeSql(val)
        }
        
        const insert = `INSERT OR REPLACE INTO boxerBouts (
          boxerId, boutDate, opponentName, opponentWeight, opponentRecord,
          venueName, refereeName, judge1Name, judge1Score, judge2Name, judge2Score,
          judge3Name, judge3Score, numRoundsScheduled, result, resultMethod,
          resultRound, eventPageLink, boutPageLink, scorecardsPageLink, titleFight
        ) VALUES (
          ${escapeSql(boxerId)},
          ${valueOrNull(bout.boutDate)},
          ${valueOrNull(bout.opponentName)},
          ${valueOrNull(bout.opponentWeight)},
          ${valueOrNull(bout.opponentRecord)},
          ${valueOrNull(bout.venueName)},
          ${valueOrNull(bout.refereeName)},
          ${valueOrNull(bout.judge1Name)},
          ${valueOrNull(bout.judge1Score)},
          ${valueOrNull(bout.judge2Name)},
          ${valueOrNull(bout.judge2Score)},
          ${valueOrNull(bout.judge3Name)},
          ${valueOrNull(bout.judge3Score)},
          ${valueOrNull(bout.numRoundsScheduled)},
          ${valueOrNull(bout.result)},
          ${valueOrNull(bout.resultMethod)},
          ${valueOrNull(bout.resultRound)},
          ${valueOrNull(bout.eventPageLink)},
          ${valueOrNull(bout.boutPageLink)},
          ${valueOrNull(bout.scorecardsPageLink)},
          ${valueOrNull(!!bout.titleFight)}
        );`
        
        boutsInserts.push(insert)
      }
      
    } catch (error) {
      console.warn(`Failed to process bouts for ${file}:`, error.message)
    }
  }
  
  const sql = `-- Seed boxer bouts data\n${boutsInserts.join('\n\n')}`
  await fs.writeFile('seed-boxer-bouts.sql', sql)
  console.log(`✅ Generated seed-boxer-bouts.sql with ${boutsInserts.length} bouts`)
}

async function main() {
  try {
    await generateBoxersSeed()
    await generateBoxerBoutsSeed()
    console.log('🎉 All SQL seed files generated successfully!')
  } catch (error) {
    console.error('💥 Error generating seed files:', error)
    process.exit(1)
  }
}

main()
