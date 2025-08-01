// Shared seeder functions for NuxtHub tasks and CLI
import { eq, and } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/better-sqlite3'
import Database from 'better-sqlite3'
import { tables } from '../utils/drizzle'
import { promises as fs } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { sql } from 'drizzle-orm'

export async function seedDivisions() {
  console.log('Seeding divisions table…')
  const dbPath = process.env.DRIZZLE_DB_URL || './.data/hub/d1/miniflare-D1DatabaseObject/7b8799eb95f0bb5448e259812996a461ce40142dacbdea254ea597e307767f45.sqlite'
  const sqlite = new Database(dbPath)
  const db = drizzle(sqlite, { schema: tables })
  const divisionsData = [
    { id: 'minimumweight', slug: 'minimumweight', name: 'Minimumweight', shortName: 'minimum', weightLimitPounds: 105, weightLimitKilograms: 47.627, weightLimitStone: '7st 7lbs', alternativeNames: JSON.stringify(['Mini Flyweight']) },
    { id: 'light-flyweight', slug: 'light-flyweight', name: 'Light Flyweight', shortName: 'light fly', weightLimitPounds: 108, weightLimitKilograms: 48.988, weightLimitStone: '7st 10lbs', alternativeNames: JSON.stringify(['Junior Flyweight']) },
    { id: 'flyweight', slug: 'flyweight', name: 'Flyweight', shortName: 'fly', weightLimitPounds: 112, weightLimitKilograms: 50.802, weightLimitStone: '8st', alternativeNames: undefined },
    { id: 'super-flyweight', slug: 'super-flyweight', name: 'Super Flyweight', shortName: 'super fly', weightLimitPounds: 115, weightLimitKilograms: 52.163, weightLimitStone: '8st 3lbs', alternativeNames: JSON.stringify(['Junior Bantamweight']) },
    { id: 'bantamweight', slug: 'bantamweight', name: 'Bantamweight', shortName: 'bantam', weightLimitPounds: 118, weightLimitKilograms: 53.525, weightLimitStone: '8st 6lbs', alternativeNames: undefined },
    { id: 'super-bantamweight', slug: 'super-bantamweight', name: 'Super Bantamweight', shortName: 'super bantam', weightLimitPounds: 122, weightLimitKilograms: 55.338, weightLimitStone: '8st 10lbs', alternativeNames: JSON.stringify(['Junior Featherweight']) },
    { id: 'featherweight', slug: 'featherweight', name: 'Featherweight', shortName: 'feather', weightLimitPounds: 126, weightLimitKilograms: 57.153, weightLimitStone: '9st', alternativeNames: undefined },
    { id: 'super-featherweight', slug: 'super-featherweight', name: 'Super Featherweight', shortName: 'super feather', weightLimitPounds: 130, weightLimitKilograms: 58.967, weightLimitStone: '9st 4lbs', alternativeNames: JSON.stringify(['Junior Lightweight']) },
    { id: 'lightweight', slug: 'lightweight', name: 'Lightweight', shortName: 'light', weightLimitPounds: 135, weightLimitKilograms: 61.235, weightLimitStone: '9st 9lbs', alternativeNames: undefined },
    { id: 'super-lightweight', slug: 'super-lightweight', name: 'Super Lightweight', shortName: 'super light', weightLimitPounds: 140, weightLimitKilograms: 63.503, weightLimitStone: '10st', alternativeNames: JSON.stringify(['Junior Welterweight']) },
    { id: 'welterweight', slug: 'welterweight', name: 'Welterweight', shortName: 'welter', weightLimitPounds: 147, weightLimitKilograms: 66.678, weightLimitStone: '10st 7lbs', alternativeNames: undefined },
    { id: 'super-welterweight', slug: 'super-welterweight', name: 'Super Welterweight', shortName: 'super welter', weightLimitPounds: 154, weightLimitKilograms: 69.85, weightLimitStone: '11st', alternativeNames: JSON.stringify(['Junior Middleweight']) },
    { id: 'middleweight', slug: 'middleweight', name: 'Middleweight', shortName: 'middle', weightLimitPounds: 160, weightLimitKilograms: 72.574, weightLimitStone: '11st 6lbs', alternativeNames: undefined },
    { id: 'super-middleweight', slug: 'super-middleweight', name: 'Super Middleweight', shortName: 'super middle', weightLimitPounds: 168, weightLimitKilograms: 76.203, weightLimitStone: '12st', alternativeNames: undefined },
    { id: 'light-heavyweight', slug: 'light-heavyweight', name: 'Light Heavyweight', shortName: 'light heavy', weightLimitPounds: 175, weightLimitKilograms: 79.378, weightLimitStone: '12st 7lbs', alternativeNames: undefined },
    { id: 'cruiserweight', slug: 'cruiserweight', name: 'Cruiserweight', shortName: 'cruiser', weightLimitPounds: 200, weightLimitKilograms: 90.718, weightLimitStone: '14st 4lbs', alternativeNames: JSON.stringify(['Junior Heavyweight']) },
    { id: 'heavyweight', slug: 'heavyweight', name: 'Heavyweight', shortName: 'heavy', weightLimitPounds: 201, weightLimitKilograms: 90.719, weightLimitStone: `14st 5lbs`, alternativeNames: undefined },
  ]
  let inserted = 0
  for (const division of divisionsData) {
    await db.insert(tables.divisions).values(division).onConflictDoUpdate({
      target: tables.divisions.id,
      set: division
    })
    inserted++
  }
  return { result: 'success', count: inserted }
}

export async function seedBoxers() {
  console.log('Seeding boxers table…')
  const __dirname = dirname(fileURLToPath(import.meta.url))
  const dataDir = join(__dirname, '../../data/boxrec_json')
  const dbPath = process.env.DRIZZLE_DB_URL || './.data/hub/d1/miniflare-D1DatabaseObject/7b8799eb95f0bb5448e259812996a461ce40142dacbdea254ea597e307767f45.sqlite'
  const sqlite = new Database(dbPath)
  const db = drizzle(sqlite, { schema: tables })
  const files = await fs.readdir(dataDir)
  let inserted = 0
  for (const file of files) {
    if (!file.endsWith('.json')) continue
    const content = await fs.readFile(join(dataDir, file), 'utf-8')
    const boxer = JSON.parse(content)
    let finalSlug = boxer.slug
    const existingBoxer = await db
      .select()
      .from(tables.boxers)
      .where(eq(tables.boxers.slug, finalSlug))
      .get()
    if (existingBoxer && existingBoxer.boxrecId !== boxer.boxrecId) {
      finalSlug = `${boxer.slug}-${boxer.boxrecId}`
    }
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

export async function seedBoxerBouts() {
  console.log('Seeding boxerBouts table…')
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
        result: bout.result || undefined,
        method: bout.method || undefined,
        round: bout.round || undefined,
        scheduledRounds: bout.scheduledRounds || undefined,
        titles: bout.titles ? JSON.stringify(bout.titles) : undefined,
        notes: bout.notes || undefined
      }
      try {
        await db.insert(tables.boxerBouts).values(record)
        inserted += 1
      } catch (e: any) {
        // Upsert logic if needed
        continue
      }
    }
  }
  return { result: 'success', count: inserted }
}
