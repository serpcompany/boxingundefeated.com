import { sqliteTable, text, integer, index } from 'drizzle-orm/sqlite-core'
import { sql } from 'drizzle-orm'

export const boxers = sqliteTable('boxer', {
  id: text().primaryKey(),
  boxrecId: text().notNull().unique(),
  boxrecUrl: text().notNull(),
  slug: text().notNull().unique(),
  
  fullName: text().notNull(),
  birthName: text(),
  nickname: text(),
  gender: text(), // 'male' | 'female'
  
  avatarImage: text(),
  
  residence: text(),
  birthPlace: text(),
  dateOfBirth: text(),
  nationality: text(),
  
  height: text(),
  reach: text(),
  weight: text(),
  stance: text(), // 'orthodox' | 'southpaw'
  
  bio: text(),
  
  promoter: text(), // TODO: FK to people table
  trainer: text(), // TODO: FK to people table
  manager: text(), // TODO: FK to people table
  gym: text(), // TODO: FK to gyms table
  
  proDebutDate: text(),
  proDivision: text(),
  proWins: integer().notNull().default(0),
  proWinsByKnockout: integer().notNull().default(0),
  proLosses: integer().notNull().default(0),
  proLossesByKnockout: integer().notNull().default(0),
  proDraws: integer().notNull().default(0),
  proStatus: text(), // 'active' | 'inactive'
  proTotalBouts: integer().notNull().default(0),
  proTotalRounds: integer().notNull().default(0),
  
  amateurDebutDate: text(),
  amateurDivision: text(),
  amateurWins: integer().notNull().default(0),
  amateurWinsByKnockout: integer().notNull().default(0),
  amateurLosses: integer().notNull().default(0),
  amateurLossesByKnockout: integer().notNull().default(0),
  amateurDraws: integer().notNull().default(0),
  amateurStatus: text(), // 'active' | 'inactive'
  amateurTotalBouts: integer().notNull().default(0),
  amateurTotalRounds: integer().notNull().default(0),
  
  isChampion: integer({ mode: 'boolean' }),
  ranking: integer(),
  
  createdAt: text().notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text().notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => ({
  slugIdx: index('boxer_slug_idx').on(table.slug),
  boxrecIdIdx: index('boxer_boxrec_id_idx').on(table.boxrecId),
  nationalityIdx: index('boxer_nationality_idx').on(table.nationality),
  divisionIdx: index('boxer_division_idx').on(table.proDivision),
}))