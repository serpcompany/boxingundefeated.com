// #!/usr/bin/env npx tsx

// import { drizzle } from 'drizzle-orm/better-sqlite3'
// import Database from 'better-sqlite3'
// import * as schema from '../server/db/schema'
// import { readFileSync } from 'fs'
// import { glob } from 'glob'
// import { eq } from 'drizzle-orm'

// async function importAllBoxerBouts() {
//   const jsonFilePath = process.argv[2]
  
//   if (!jsonFilePath) {
//     console.error('Usage: npx tsx scripts/import-all-boxer-bouts.ts <path-to-json-file>')
//     console.error('Example: npx tsx scripts/import-all-boxer-bouts.ts ~/Desktop/boxerBouts.json')
//     process.exit(1)
//   }
  
//   console.log(`Reading data from ${jsonFilePath}...`)
//   const jsonData = JSON.parse(readFileSync(jsonFilePath, 'utf-8'))
  
//   // Connect to local database
//   const localDbPath = './.data/hub/d1/miniflare-D1DatabaseObject/*.sqlite'
//   const files = await glob(localDbPath)
  
//   if (files.length === 0) {
//     throw new Error('Local SQLite database not found. Run "nuxt dev" first.')
//   }
  
//   const sqlite = new Database(files[0])
//   const db = drizzle(sqlite, { schema })
  
//   console.log(`Found ${jsonData.length} bouts in JSON file`)
  
//   // Get all boxers and create a mapping from boxrecId to id
//   const localBoxers = await db.select({
//     id: schema.boxers.id,
//     boxrecId: schema.boxers.boxrecId
//   }).from(schema.boxers)
  
//   const boxerIdMap = new Map(
//     localBoxers.map(b => [b.boxrecId, b.id])
//   )
  
//   console.log(`Found ${localBoxers.length} boxers in local database`)
  
//   // For bouts where we can't find the boxer, we'll need to look them up by boxrecId
//   const boutsToInsert = []
//   const missingBoxerIds = new Set<string>()
  
//   for (const bout of jsonData) {
//     const localBoxerId = boxerIdMap.get(bout.boxerId)
    
//     if (localBoxerId) {
//       // We found the boxer, use their UUID
//       boutsToInsert.push({
//         ...bout,
//         id: undefined, // Let DB auto-increment
//         boxerId: localBoxerId,
//         titleFight: bout.titleFight === 1 ? 1 : 0,
//         createdAt: undefined // Let DB set timestamp
//       })
//     } else {
//       // Boxer not found - let's try to find by boxrecId
//       const boxer = await db.select().from(schema.boxers)
//         .where(eq(schema.boxers.boxrecId, bout.boxerId))
//         .limit(1)
      
//       if (boxer.length > 0) {
//         boutsToInsert.push({
//           ...bout,
//           id: undefined,
//           boxerId: boxer[0].id,
//           titleFight: bout.titleFight === 1 ? 1 : 0,
//           createdAt: undefined
//         })
//       } else {
//         missingBoxerIds.add(bout.boxerId)
//       }
//     }
//   }
  
//   console.log(`\nFound ${boutsToInsert.length} bouts that can be imported`)
//   console.log(`Missing ${missingBoxerIds.size} unique boxers: ${Array.from(missingBoxerIds).slice(0, 10).join(', ')}...`)
  
//   if (boutsToInsert.length === 0) {
//     console.log('No bouts to import')
//     sqlite.close()
//     return
//   }
  
//   // Clear existing bouts
//   console.log('\nClearing existing boxer bouts...')
//   await db.delete(schema.boxerBouts)
  
//   // Insert in batches
//   const batchSize = 100
//   for (let i = 0; i < boutsToInsert.length; i += batchSize) {
//     const batch = boutsToInsert.slice(i, i + batchSize)
//     await db.insert(schema.boxerBouts).values(batch)
//     console.log(`Inserted ${i + batch.length} / ${boutsToInsert.length} bouts...`)
//   }
  
//   console.log('\n✅ Import completed!')
//   console.log(`Total bouts imported: ${boutsToInsert.length}`)
  
//   if (missingBoxerIds.size > 0) {
//     console.log(`\n⚠️  ${jsonData.length - boutsToInsert.length} bouts were skipped because their boxers don't exist in local database`)
//     console.log('To import all bouts, first import all boxers from the preview database')
//   }
  
//   sqlite.close()
// }

// importAllBoxerBouts().catch(console.error)