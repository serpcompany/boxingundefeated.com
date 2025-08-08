import { sqliteTable, text, integer, real, index } from 'drizzle-orm/sqlite-core'
import { sql } from 'drizzle-orm'

export const divisions = sqliteTable('divisions', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  slug: text('slug').notNull().unique(),
  name: text('name').notNull(),
  shortName: text('shortName'), // e.g., "super feather" for "Super Featherweight"
  alternativeNames: text('alternativeNames'), // JSON array stored as text
  
  weightLimitPounds: real('weightLimitPounds').notNull(),
  weightLimitKilograms: real('weightLimitKilograms').notNull(),
  weightLimitStone: text('weightLimitStone'), // e.g., "10st 7lbs"
  
  createdAt: text('createdAt').notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text('updatedAt').notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => ({
  slugIdx: index('divisionsSlugIdx').on(table.slug),
  shortNameIdx: index('divisionsShortNameIdx').on(table.shortName),
}))