import { drizzle } from 'drizzle-orm/d1'
export { sql, eq, and, or, desc, asc, inArray } from 'drizzle-orm'
import * as schema from '../db/schema'

export const tables = schema

export function useDrizzle() {
  return drizzle(hubDatabase(), { 
    schema,
    casing: 'camelCase'
  })
}

export type Boxer = typeof schema.boxers.$inferSelect
export type BoxerBout = typeof schema.boxerBouts.$inferInsert
export type Division = typeof schema.divisions.$inferSelect
export type NewDivision = typeof schema.divisions.$inferInsert