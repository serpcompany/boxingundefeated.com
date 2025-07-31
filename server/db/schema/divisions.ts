import { sqliteTable, text, integer, real, index } from 'drizzle-orm/sqlite-core'
import { sql } from 'drizzle-orm'

export const divisions = sqliteTable('divisions', {
  id: text().primaryKey(),
  slug: text().notNull().unique(),
  name: text().notNull(),
  alternativeNames: text(), // JSON array stored as text
  
  weightLimitPounds: real().notNull(),
  
  description: text(),
  order: integer().notNull(),
  
  createdAt: text().notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text().notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => ({
  slugIdx: index('divisions_slug_idx').on(table.slug),
  orderIdx: index('divisions_order_idx').on(table.order),
}))