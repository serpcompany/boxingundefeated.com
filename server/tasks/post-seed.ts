// server/tasks/after-seed.ts
import { drizzle } from 'drizzle-orm/better-sqlite3'
import Database from 'better-sqlite3'
import { tables } from '../utils/drizzle'
import { sql } from 'drizzle-orm'

async function main() {
  // Use env or fallback to default path
  const dbPath = process.env.DRIZZLE_DB_URL || './.data/hub/d1/miniflare-D1DatabaseObject/7b8799eb95f0bb5448e259812996a461ce40142dacbdea254ea597e307767f45.sqlite'
  const sqlite = new Database(dbPath)
  const db = drizzle(sqlite, { schema: tables })

  // Count boxers
  const result = await db.select({ count: sql`count(*)` }).from(tables.boxers).get()
  const count = typeof result?.count === 'number' ? result.count : Number(result?.count || 0)
  console.log(`Total boxers in database: ${count}`)

  // Count boxers whose slug contains their boxrecId
  const boxersWithIdInSlug = await db
    .select({ count: sql`count(*)` })
    .from(tables.boxers)
    .where(sql`instr(slug, boxrecId) > 0`)
    .get()
  const idInSlugCount = typeof boxersWithIdInSlug?.count === 'number' ? boxersWithIdInSlug.count : Number(boxersWithIdInSlug?.count || 0)
  console.log(`Boxers with boxrecId in slug: ${idInSlugCount}`)
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((err) => {
    console.error(err)
    process.exit(1)
  })
}
