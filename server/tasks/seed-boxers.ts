// Allow running directly from CLI (ESM compatible)
if (import.meta.url === `file://${process.argv[1]}`) {
  seedBoxers().then(console.log).catch((err) => {
    console.error(err)
    process.exit(1)
  })
}
// server/tasks/seed-boxers.ts
import { eq } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/better-sqlite3'
import Database from 'better-sqlite3'
import { tables } from '../utils/drizzle'
import { promises as fs } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

export async function seedBoxers() {
  console.log('Seeding boxers table…')

  const __dirname = dirname(fileURLToPath(import.meta.url))
  const dataDir = join(__dirname, '../../data/boxrec_json')

  // Use env or fallback to default path
  const dbPath = process.env.DRIZZLE_DB_URL || './.data/hub/d1/miniflare-D1DatabaseObject/7b8799eb95f0bb5448e259812996a461ce40142dacbdea254ea597e307767f45.sqlite'
  const sqlite = new Database(dbPath)
  const db = drizzle(sqlite, { schema: tables })

  const files = await fs.readdir(dataDir)
  let inserted = 0

  for (const file of files) {
    if (!file.endsWith('.json')) continue
    const content = await fs.readFile(join(dataDir, file), 'utf-8')
    const boxer = JSON.parse(content)

    // Check if slug already exists
    let finalSlug = boxer.slug
    const existingBoxer = await db
      .select()
      .from(tables.boxers)
      .where(eq(tables.boxers.slug, finalSlug))
      .get()

    // Only append boxrecId if slug exists and it's a different boxer
    if (existingBoxer && existingBoxer.boxrecId !== boxer.boxrecId) {
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
      birthName: boxer.birthName || undefined,
      nicknames: boxer.nicknames || undefined,
      avatarImage: boxer.avatarImage || undefined,
      residence: boxer.residence || undefined,
      birthPlace: boxer.birthPlace || undefined,
      dateOfBirth: boxer.dateOfBirth || undefined,
      gender: boxer.gender || undefined,
      nationality: boxer.nationality || undefined,
      height: boxer.height ? String(boxer.height) : undefined,
      reach: boxer.reach ? String(boxer.reach) : undefined,
      stance: boxer.stance || undefined,
      bio: boxer.bio || undefined,
      promoters: boxer.promoters || undefined,
      trainers: boxer.trainers || undefined,
      managers: boxer.managers || undefined,
      gym: boxer.gym || undefined,
      proDebutDate: boxer.proDebutDate || undefined,
      proDivision: boxer.proDivision || undefined,
      proWins: boxer.proWins ? Number(boxer.proWins) : undefined,
      proWinsByKnockout: boxer.proWinsByKnockout ? Number(boxer.proWinsByKnockout) : undefined,
      proLosses: boxer.proLosses ? Number(boxer.proLosses) : undefined,
      proLossesByKnockout: boxer.proLossesByKnockout ? Number(boxer.proLossesByKnockout) : undefined,
      proDraws: boxer.proDraws ? Number(boxer.proDraws) : undefined,
      proStatus: boxer.proStatus || undefined,
      proTotalBouts: boxer.proTotalBouts ? Number(boxer.proTotalBouts) : undefined,
      proTotalRounds: boxer.proTotalRounds ? Number(boxer.proTotalRounds) : undefined,
      amateurDebutDate: boxer.amateurDebutDate || undefined,
      amateurDivision: boxer.amateurDivision || undefined,
      amateurWins: boxer.amateurWins ? Number(boxer.amateurWins) : undefined,
      amateurWinsByKnockout: boxer.amateurWinsByKnockout ? Number(boxer.amateurWinsByKnockout) : undefined,
      amateurLosses: boxer.amateurLosses ? Number(boxer.amateurLosses) : undefined,
      amateurLossesByKnockout: boxer.amateurLossesByKnockout ? Number(boxer.amateurLossesByKnockout) : undefined,
      amateurDraws: boxer.amateurDraws ? Number(boxer.amateurDraws) : undefined,
      amateurStatus: boxer.amateurStatus || undefined,
      amateurTotalBouts: boxer.amateurTotalBouts ? Number(boxer.amateurTotalBouts) : undefined,
      amateurTotalRounds: boxer.amateurTotalRounds ? Number(boxer.amateurTotalRounds) : undefined
    }

    try {
      await db.insert(tables.boxers).values(record)
      inserted += 1
    } catch (e: any) {
      console.log(`Conflict on boxrecUrl ${record.boxrecUrl}, updating existing row.`)
      await db
        .update(tables.boxers)
        .set(record)
        .where(eq(tables.boxers.boxrecUrl, record.boxrecUrl))
      continue
    }
  }

  return { result: 'success', count: inserted }
}
// Nuxt DevTools GUI support (uncomment for Nuxt DevTools, comment for CLI/tsx)
// export default defineTask({
//   meta: {
//     name: 'db:seed-boxers',
//     description: 'Seed the boxers table with BoxRec JSON files'
//   },
//   async run() {
//     return seedBoxers()
//   },
// })