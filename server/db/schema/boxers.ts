import { sqliteTable, text, integer, index } from 'drizzle-orm/sqlite-core'
import { sql } from 'drizzle-orm'

export const boxers = sqliteTable('boxers', {
  id: text().primaryKey(),
  boxrecId: text().notNull().unique(),
  boxrecUrl: text().notNull(),
  boxrecWikiUrl: text(),
  slug: text().notNull().unique(),
  
  fullName: text().notNull(),
  birthName: text(),
  nickname: text(),
  gender: text(), // 'male' | 'female'
  
  imageUrl: text(),
  
  residence: text(),
  birthPlace: text(),
  dateOfBirth: text(),
  nationality: text(),
  age: integer(),
  
  height: text(),
  reach: text(),
  weight: text(),
  stance: text(), // 'orthodox' | 'southpaw'
  
  bio: text(),
  bioSections: text(),
  
  promoter: text(),
  trainer: text(),
  manager: text(),
  gym: text(),
  
  proDebutDate: text(),
  proDivision: text(),
  proWins: integer().notNull().default(0),
  proWinsByKnockout: integer().notNull().default(0),
  proLosses: integer().notNull().default(0),
  proLossesByKnockout: integer().notNull().default(0),
  proDraws: integer().notNull().default(0),
  proStatus: text(), // 'active' | 'retired'
  proTotalBouts: integer().notNull().default(0),
  proTotalRounds: integer().notNull().default(0),
  
  amateurDebutDate: text(),
  amateurDivision: text(),
  amateurWins: integer().notNull().default(0),
  amateurWinsByKnockout: integer().notNull().default(0),
  amateurLosses: integer().notNull().default(0),
  amateurLossesByKnockout: integer().notNull().default(0),
  amateurDraws: integer().notNull().default(0),
  amateurStatus: text(),
  amateurTotalBouts: integer().notNull().default(0),
  amateurTotalRounds: integer().notNull().default(0),
  
  name: text(),
  birthDate: text(),
  image: text(),
  division: text(),
  active: integer({ mode: 'boolean' }),
  isChampion: integer({ mode: 'boolean' }),
  ranking: integer(),
  
  createdAt: text().notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text().notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => ({
  slugIdx: index('boxers_slug_idx').on(table.slug),
  boxrecIdIdx: index('boxers_boxrec_id_idx').on(table.boxrecId),
  nationalityIdx: index('boxers_nationality_idx').on(table.nationality),
  divisionIdx: index('boxers_division_idx').on(table.proDivision),
}))