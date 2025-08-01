/**
 * BoxerBouts table stores individual fight records from a specific boxer's perspective.
 * This is a denormalized table designed for displaying fight history on boxer profile pages.
 * 
 * Note: This is not a complete bouts table with full fight data between two boxers.
 * It's a subset of fields available from the boxer's fight history, which will be
 * populated from scraped data. Full bout details and calculated fields would require
 * pulling complete fight data from all participants.
 */

import { sqliteTable, text, integer, index, unique } from 'drizzle-orm/sqlite-core'
import { sql } from 'drizzle-orm'
import { boxers } from './boxers'

export const boxerBouts = sqliteTable('boxerBouts', {
  id: integer().primaryKey({ autoIncrement: true }),
  boxerId: text().notNull().references(() => boxers.id, { onDelete: 'cascade' }),
  boxrecId: text(),

  boutDate: text().notNull(),
  opponentName: text().notNull(),
  opponentWeight: text(),
  opponentRecord: text(),
  eventName: text(),
  refereeName: text(),

  judge1Name: text(),
  judge1Score: text(),
  judge2Name: text(),
  judge2Score: text(),
  judge3Name: text(),
  judge3Score: text(),

  numRoundsScheduled: integer(),
  result: text().notNull(), // 'win' | 'loss' | 'draw' | 'no-contest'
  resultMethod: text(), // 'ko' | 'tko' | 'decision' | 'dq' | 'rtd'
  resultRound: integer(),

  eventPageLink: text(),
  boutPageLink: text(),
  scorecardsPageLink: text(),

  titleFight: integer({ mode: 'boolean' }).default(false),

  createdAt: text().notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => ({
  boxerIdIdx: index('boxerBoutsBoxerIdIdx').on(table.boxerId),
  boutDateIdx: index('boxerBoutsDateIdx').on(table.boutDate),
  uniqueBoxerBout: unique('uniqueBoxerBout').on(table.boxerId, table.boutPageLink),
}))