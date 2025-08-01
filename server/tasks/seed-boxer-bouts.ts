// server/tasks/seed-boxer-bouts.ts
import { useDrizzle, tables } from '../utils/drizzle'
import { promises as fs } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { eq } from 'drizzle-orm'

export default defineTask({
  meta: {
    name: 'db:seed-boxer-bouts',
    description: 'Seed the boxerBouts table with BoxRec bout data'
  },
  async run() {
    console.log('Seeding boxerBouts table…')

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
          opponentWeight: bout.opponentWeight || null,
          opponentRecord: bout.opponentRecord || null,
          venueName: bout.venueName || null,
          refereeName: bout.refereeName || null,
          judge1Name: bout.judge1Name || null,
          judge1Score: bout.judge1Score || null,
          judge2Name: bout.judge2Name || null,
          judge2Score: bout.judge2Score || null,
          judge3Name: bout.judge3Name || null,
          judge3Score: bout.judge3Score || null,
          numRoundsScheduled: bout.numRoundsScheduled ? Number(bout.numRoundsScheduled) : null,
          result: bout.result,
          resultMethod: bout.resultMethod || null,
          resultRound: bout.resultRound ? Number(bout.resultRound) : null,
          eventPageLink: bout.eventPageLink || null,
          boutPageLink: bout.boutPageLink || null,
          scorecardsPageLink: bout.scorecardsPageLink || null,
          titleFight: !!bout.titleFight,
        }

        // Upsert: insert or update existing by boxerId + boutPageLink
        try {
          await useDrizzle()
            .insert(tables.boxerBouts)
            .values(record)
          inserted++
        } catch (e: any) {
          console.warn(`Conflict for boxerId=${boxerId}, boutPageLink=${record.boutPageLink}. Updating…`)
          await useDrizzle()
            .update(tables.boxerBouts)
            .set(record)
            .where(eq(tables.boxerBouts.boxerId, boxerId))
            .where(eq(tables.boxerBouts.boutPageLink, record.boutPageLink))
          inserted++
        }
      }
    }

    return { result: 'success', count: inserted }
  }
})