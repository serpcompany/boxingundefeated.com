import { readdir, readFile, writeFile } from 'fs/promises'
import { join } from 'path'
import { v4 as uuidv4 } from 'uuid'

interface BoxrecData {
  boxrecId: string
  boxrecUrl: string
  boxrecWikiUrl?: string
  name: string
  slug: string
  birthName?: string
  nicknames?: string
  avatarImage?: string
  birthPlace?: string
  dateOfBirth?: string
  nationality?: string
  stance?: string
  height?: string
  reach?: string
  proDivision?: string
  residence?: string
  proStatus?: string
  proDebutDate?: string
  gender?: string
  proWins?: string | number
  proWinsByKnockout?: string | number
  proLosses?: string | number
  proLossesByKnockout?: string | number
  proDraws?: string | number
  proTotalBouts?: string | number
  proTotalRounds?: string | number
}

// Map division names to our division IDs
const divisionMap: Record<string, string> = {
  'minimumweight': 'minimumweight',
  'minimum': 'minimumweight',
  'light flyweight': 'lightflyweight',
  'light fly': 'lightflyweight',
  'flyweight': 'flyweight',
  'fly': 'flyweight',
  'super flyweight': 'superflyweight',
  'super fly': 'superflyweight',
  'bantamweight': 'bantamweight',
  'bantam': 'bantamweight',
  'super bantamweight': 'superbantamweight',
  'super bantam': 'superbantamweight',
  'featherweight': 'featherweight',
  'feather': 'featherweight',
  'super featherweight': 'superfeatherweight',
  'super feather': 'superfeatherweight',
  'lightweight': 'lightweight',
  'light': 'lightweight',
  'super lightweight': 'superlightweight',
  'super light': 'superlightweight',
  'light welterweight': 'superlightweight',
  'welterweight': 'welterweight',
  'welter': 'welterweight',
  'super welterweight': 'superwelterweight',
  'super welter': 'superwelterweight',
  'light middleweight': 'superwelterweight',
  'middleweight': 'middleweight',
  'middle': 'middleweight',
  'super middleweight': 'supermiddleweight',
  'super middle': 'supermiddleweight',
  'light heavyweight': 'lightheavyweight',
  'light heavy': 'lightheavyweight',
  'cruiserweight': 'cruiserweight',
  'cruiser': 'cruiserweight',
  'heavyweight': 'heavyweight',
  'heavy': 'heavyweight'
}

function normalizeDivision(division?: string): string | null {
  if (!division) return null
  const normalized = division.toLowerCase().trim()
  return divisionMap[normalized] || null
}

function sqlEscape(value: string | null | undefined): string {
  if (value === null || value === undefined) return 'NULL'
  // Escape single quotes by doubling them
  return `'${value.replace(/'/g, "''")}'`
}

function parseHeight(height?: string): string | null {
  if (!height) return null
  // If already numeric, return as is
  if (/^\d+$/.test(height)) return height
  // Convert format like "5′ 9″ / 175cm" to just "175"
  const match = height.match(/(\d+)cm/)
  return match ? match[1] : null
}

function parseReach(reach?: string): string | null {
  if (!reach) return null
  // If already numeric, return as is
  if (/^\d+$/.test(reach)) return reach
  // Convert format like "69″ / 175cm" to just "175"
  const match = reach.match(/(\d+)cm/)
  return match ? match[1] : null
}

function toNumber(value?: string | number): number {
  if (typeof value === 'number') return value
  if (!value) return 0
  return parseInt(value, 10) || 0
}

async function generateMigration() {
  const dataDir = join(process.cwd(), 'data', 'boxrec_json')
  const files = await readdir(dataDir)
  const jsonFiles = files.filter(f => f.endsWith('.json'))
  
  console.log(`Processing ${jsonFiles.length} boxer files...`)
  
  let sqlStatements: string[] = []
  let processedCount = 0
  let skippedCount = 0
  
  // Process in batches to avoid memory issues
  const batchSize = 100
  
  for (let i = 0; i < jsonFiles.length; i += batchSize) {
    const batch = jsonFiles.slice(i, i + batchSize)
    
    for (const file of batch) {
      try {
        const content = await readFile(join(dataDir, file), 'utf-8')
        const data: BoxrecData = JSON.parse(content)
        
        // Skip if no name
        if (!data.name) {
          skippedCount++
          continue
        }
        
        const id = uuidv4()
        const division = normalizeDivision(data.proDivision)
        const gender = data.gender === 'F' ? 'F' : 'M'
        const height = parseHeight(data.height)
        const reach = parseReach(data.reach)
        
        // Build the INSERT statement
        const values = [
          sqlEscape(id),
          sqlEscape(data.boxrecId),
          sqlEscape(data.boxrecUrl),
          sqlEscape(data.boxrecWikiUrl),
          sqlEscape(data.slug),
          sqlEscape(data.name),
          sqlEscape(data.birthName),
          sqlEscape(data.nicknames),
          sqlEscape(data.avatarImage),
          sqlEscape(data.residence),
          sqlEscape(data.birthPlace),
          sqlEscape(data.dateOfBirth),
          sqlEscape(gender),
          sqlEscape(data.nationality),
          sqlEscape(height),
          sqlEscape(reach),
          sqlEscape(data.stance),
          'NULL', // bio
          'NULL', // promoters
          'NULL', // trainers
          'NULL', // managers
          'NULL', // gym
          sqlEscape(data.proDebutDate),
          sqlEscape(division),
          toNumber(data.proWins),
          toNumber(data.proWinsByKnockout),
          toNumber(data.proLosses),
          toNumber(data.proLossesByKnockout),
          toNumber(data.proDraws),
          sqlEscape(data.proStatus === 'inactive' ? 'inactive' : 'active'),
          toNumber(data.proTotalBouts),
          toNumber(data.proTotalRounds),
          'NULL', // amateurDebutDate
          'NULL', // amateurDivision
          'NULL', // amateurWins
          'NULL', // amateurWinsByKnockout
          'NULL', // amateurLosses
          'NULL', // amateurLossesByKnockout
          'NULL', // amateurDraws
          'NULL', // amateurStatus
          'NULL', // amateurTotalBouts
          'NULL', // amateurTotalRounds
          'CURRENT_TIMESTAMP',
          'CURRENT_TIMESTAMP'
        ]
        
        sqlStatements.push(`(${values.join(', ')})`)
        processedCount++
        
      } catch (error) {
        console.error(`Error processing ${file}:`, error)
        skippedCount++
      }
    }
    
    console.log(`Processed ${i + batch.length} of ${jsonFiles.length} files...`)
  }
  
  console.log(`Processed ${processedCount} boxers, skipped ${skippedCount}`)
  
  // Split into multiple smaller migration files
  const recordsPerFile = 500 // Split into chunks of 500 records
  const fileCount = Math.ceil(sqlStatements.length / recordsPerFile)
  
  for (let i = 0; i < fileCount; i++) {
    const start = i * recordsPerFile
    const end = Math.min((i + 1) * recordsPerFile, sqlStatements.length)
    const chunk = sqlStatements.slice(start, end)
    
    const migrationContent = `-- Seed boxer data part ${i + 1} of ${fileCount}
-- Generated from boxrec_json directory (records ${start + 1} to ${end})

INSERT OR IGNORE INTO boxers (
  id, boxrecId, boxrecUrl, boxrecWikiUrl, slug, name, birthName, nicknames,
  avatarImage, residence, birthPlace, dateOfBirth, gender, nationality,
  height, reach, stance, bio, promoters, trainers, managers, gym,
  proDebutDate, proDivision, proWins, proWinsByKnockout, proLosses,
  proLossesByKnockout, proDraws, proStatus, proTotalBouts, proTotalRounds,
  amateurDebutDate, amateurDivision, amateurWins, amateurWinsByKnockout,
  amateurLosses, amateurLossesByKnockout, amateurDraws, amateurStatus,
  amateurTotalBouts, amateurTotalRounds, createdAt, updatedAt
) VALUES
${chunk.join(',\n')};
`
    
    const fileNumber = String(5 + i).padStart(4, '0')
    const migrationPath = join(process.cwd(), 'server', 'database', 'migrations', `${fileNumber}_seed-boxers-part${i + 1}.sql`)
    await writeFile(migrationPath, migrationContent)
    
    console.log(`Migration file created at: ${migrationPath} (${chunk.length} records)`)
  }
  
  console.log(`Total boxers in migrations: ${processedCount} across ${fileCount} files`)
}

// Run the script
generateMigration().catch(console.error)