// server/tasks/seed-boxers.ts
import { useDrizzle, tables } from '../utils/drizzle'
import { eq } from 'drizzle-orm'
import { promises as fs } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

export default defineTask({
  meta: {
    name: 'db:seed-boxers',
    description: 'Seed the boxers table with BoxRec JSON files'
  },
  async run() {
    console.log('Seeding boxers table…')

    const __dirname = dirname(fileURLToPath(import.meta.url))
    const dataDir = join(__dirname, '../../data/boxrec_json')

    const files = await fs.readdir(dataDir)
    let inserted = 0

    for (const file of files) {
      if (!file.endsWith('.json')) continue
      const content = await fs.readFile(join(dataDir, file), 'utf-8')
      const boxer = JSON.parse(content)

      // Check if slug already exists
      let finalSlug = boxer.slug
      const existingBoxer = await useDrizzle()
        .select()
        .from(tables.boxers)
        .where(eq(tables.boxers.slug, finalSlug))
        .get()
      
      // If slug exists, append boxrecId to make it unique
      if (existingBoxer) {
        finalSlug = `${boxer.slug}-${boxer.boxrecId}`
      }

      // Map JSON fields to your DB columns; adjust column names as needed.
      const record = {
        id: boxer.boxrecId.toString().padStart(6, '0'),
        boxrecId: boxer.boxrecId,
        boxrecUrl: boxer.boxrecUrl,
        boxrecWikiUrl: boxer.boxrecWikiUrl,
        slug: finalSlug,
        name: boxer.name,
        birthName: boxer.birthName || null,
        nicknames: boxer.nicknames || null,
        avatarImage: boxer.avatarImage || null,
        residence: boxer.residence || null,
        birthPlace: boxer.birthPlace || null,
        dateOfBirth: boxer.dateOfBirth || null,
        gender: boxer.gender || null,
        nationality: boxer.nationality || null,
        height: boxer.height ? String(boxer.height) : null,
        reach: boxer.reach ? String(boxer.reach) : null,
        stance: boxer.stance || null,
        bio: boxer.bio || null,
        promoters: boxer.promoters || null,
        trainers: boxer.trainers || null,
        managers: boxer.managers || null,
        gym: boxer.gym || null,
        proDebutDate: boxer.proDebutDate || null,
        proDivision: boxer.proDivision || null,
        proWins: boxer.proWins ? Number(boxer.proWins) : null,
        proWinsByKnockout: boxer.proWinsByKnockout ? Number(boxer.proWinsByKnockout) : null,
        proLosses: boxer.proLosses ? Number(boxer.proLosses) : null,
        proLossesByKnockout: boxer.proLossesByKnockout ? Number(boxer.proLossesByKnockout) : null,
        proDraws: boxer.proDraws ? Number(boxer.proDraws) : null,
        proStatus: boxer.proStatus || null,
        proTotalBouts: boxer.proTotalBouts ? Number(boxer.proTotalBouts) : null,
        proTotalRounds: boxer.proTotalRounds ? Number(boxer.proTotalRounds) : null,
        amateurDebutDate: boxer.amateurDebutDate || null,
        amateurDivision: boxer.amateurDivision || null,
        amateurWins: boxer.amateurWins ? Number(boxer.amateurWins) : null,
        amateurWinsByKnockout: boxer.amateurWinsByKnockout ? Number(boxer.amateurWinsByKnockout) : null,
        amateurLosses: boxer.amateurLosses ? Number(boxer.amateurLosses) : null,
        amateurLossesByKnockout: boxer.amateurLossesByKnockout ? Number(boxer.amateurLossesByKnockout) : null,
        amateurDraws: boxer.amateurDraws ? Number(boxer.amateurDraws) : null,
        amateurStatus: boxer.amateurStatus || null,
        amateurTotalBouts: boxer.amateurTotalBouts ? Number(boxer.amateurTotalBouts) : null,
        amateurTotalRounds: boxer.amateurTotalRounds ? Number(boxer.amateurTotalRounds) : null
      }

      try {
        await useDrizzle().insert(tables.boxers).values(record)
        inserted += 1
      } catch (e: any) {
        console.log(`Conflict on boxrecUrl ${record.boxrecUrl}, updating existing row.`)
        await useDrizzle()
          .update(tables.boxers)
          .set(record)
          .where(eq(tables.boxers.boxrecUrl, record.boxrecUrl))
        continue
      }
    }

    return { result: 'success', count: inserted }
  },
})