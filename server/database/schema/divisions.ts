import { sqliteTable, text, real, index } from 'drizzle-orm/sqlite-core'
import { sql } from 'drizzle-orm'

export const divisions = sqliteTable('divisions', {
  id: text().primaryKey(),
  slug: text().notNull().unique(),
  name: text().notNull(),
  shortName: text(), // e.g., "super feather" for "Super Featherweight"
  alternativeNames: text(), // JSON array stored as text
  
  weightLimitPounds: real().notNull(),
  weightLimitKilograms: real().notNull(),
  weightLimitStone: text(), // e.g., "10st 7lbs"
  
  createdAt: text().notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text().notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => ({
  slugIdx: index('divisionsSlugIdx').on(table.slug),
  shortNameIdx: index('divisionsShortNameIdx').on(table.shortName),
}))