import { sqliteTable, text, integer, index } from 'drizzle-orm/sqlite-core'
import { sql } from 'drizzle-orm'

export const boxers = sqliteTable('boxers', {
  id: text().primaryKey(),
  boxrecId: text().notNull().unique(),
  boxrecUrl: text().notNull().unique(),
  boxrecWikiUrl: text(),
  slug: text().notNull().unique(),
  
  name: text().notNull(),
  birthName: text(),
  nicknames: text(),
  
  avatarImage: text(),
  
  residence: text(),
  birthPlace: text(),
  dateOfBirth: text(),
  gender: text(), // 'M' | 'F'
  nationality: text(),
  
  height: text(), // cm by default, calculate other variations for F/E
  reach: text(), // cm by default, calculate other variations for F/E
  stance: text(), // 'orthodox' | 'southpaw'
  
  bio: text(),
  
  promoters: text(), // JSON array stored as text
  trainers: text(), // JSON array stored as text
  managers: text(), // JSON array stored as text
  gym: text(), // TODO: FK to gyms table
  
  proDebutDate: text(),
  proDivision: text(),
  proWins: integer().notNull().default(0),
  proWinsByKnockout: integer().notNull().default(0),
  proLosses: integer().notNull().default(0),
  proLossesByKnockout: integer().notNull().default(0),
  proDraws: integer().notNull().default(0),
  proStatus: text(), // 'active' | 'inactive'
  proTotalBouts: integer(),
  proTotalRounds: integer(),
  
  amateurDebutDate: text(),
  amateurDivision: text(),
  amateurWins: integer(),
  amateurWinsByKnockout: integer(),
  amateurLosses: integer(),
  amateurLossesByKnockout: integer(),
  amateurDraws: integer(),
  amateurStatus: text(), // 'active' | 'inactive'
  amateurTotalBouts: integer(),
  amateurTotalRounds: integer(),
  
  createdAt: text().notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text().notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => ({
  slugIdx: index('boxersSlugIdx').on(table.slug),
  boxrecIdIdx: index('boxersBoxrecIdIdx').on(table.boxrecId),
  nationalityIdx: index('boxersNationalityIdx').on(table.nationality),
  divisionIdx: index('boxersDivisionIdx').on(table.proDivision),
  statusIdx: index('boxersStatusIdx').on(table.proStatus),
}))