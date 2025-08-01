// server/tasks/seed-boxer-bouts.ts
import { tables } from '../utils/drizzle'
import { drizzle } from 'drizzle-orm/better-sqlite3'
import Database from 'better-sqlite3'
import { promises as fs } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { eq, and } from 'drizzle-orm'

export async function seedBoxerBouts() {
  console.log('Seeding boxerBouts table…')

  // Use env or fallback to default path
  const dbPath = process.env.DRIZZLE_DB_URL || './.data/hub/d1/miniflare-D1DatabaseObject/7b8799eb95f0bb5448e259812996a461ce40142dacbdea254ea597e307767f45.sqlite'
  const sqlite = new Database(dbPath)
  const db = drizzle(sqlite, { schema: tables })

  const __dirname = dirname(fileURLToPath(import.meta.url))
  const dataDir = join(__dirname, '../../data/boxrec_json')
  const files = await fs.readdir(dataDir)
  let inserted = 0

  for (const file of files) {
    if (!file.endsWith('.json')) continue
    const content = await fs.readFile(join(dataDir, file), 'utf-8')
    const data = JSON.parse(content)
    const boxerId = data.boxrecId.toString().padStart(6, '0')
    const bouts = Array.isArray(data.bouts) ? data.bouts : []

    for (const bout of bouts) {
      const record = {
        boxerId,
        boutDate: bout.boutDate,
        opponentName: bout.opponentName,
        opponentWeight: bout.opponentWeight || undefined,
        opponentRecord: bout.opponentRecord || undefined,
        venueName: bout.venueName || undefined,
        refereeName: bout.refereeName || undefined,
        judge1Name: bout.judge1Name || undefined,
        judge1Score: bout.judge1Score || undefined,
        judge2Name: bout.judge2Name || undefined,
        judge2Score: bout.judge2Score || undefined,
        judge3Name: bout.judge3Name || undefined,
        judge3Score: bout.judge3Score || undefined,
        numRoundsScheduled: bout.numRoundsScheduled ? Number(bout.numRoundsScheduled) : undefined,
        result: bout.result,
        resultMethod: bout.resultMethod || undefined,
        resultRound: bout.resultRound ? Number(bout.resultRound) : undefined,
        eventPageLink: bout.eventPageLink || undefined,
        boutPageLink: bout.boutPageLink || undefined,
        scorecardsPageLink: bout.scorecardsPageLink || undefined,
        titleFight: !!bout.titleFight,
      }

      // Upsert: insert or update existing by boxerId + boutPageLink
      try {
        await db
          .insert(tables.boxerBouts)
          .values(record)
        inserted++
      } catch (e: any) {
        console.warn(`Conflict for boxerId=${boxerId}, boutPageLink=${record.boutPageLink}. Updating…`)
        await db
          .update(tables.boxerBouts)
          .set(record)
          .where(and(
            eq(tables.boxerBouts.boxerId, boxerId),
            eq(tables.boxerBouts.boutPageLink, record.boutPageLink)
          ))
        inserted++
      }
    }
  }

  return { result: 'success', count: inserted }
}

// Nuxt DevTools GUI support (uncomment for Nuxt DevTools, comment for CLI/tsx)
// export default defineTask({
//   meta: {
//     name: 'db:seed-boxer-bouts',
//     description: 'Seed the boxerBouts table with BoxRec bout data'
//   },
//   async run() {
//     return seedBoxerBouts()
//   }
// })