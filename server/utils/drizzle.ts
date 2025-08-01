import { drizzle } from 'drizzle-orm/d1'
export { sql, eq, and, or, desc, asc, inArray } from 'drizzle-orm'
import * as schema from '../database/schema'

export const tables = schema

export function useDrizzle() {
  // hubDatabase() is provided by NuxtHub for D1 access
  return drizzle(hubDatabase(), { 
    schema,
    casing: 'camelCase'
  })
}

// Type exports for convenience
export type Boxer = typeof schema.boxers.$inferSelect
export type NewBoxer = typeof schema.boxers.$inferInsert
export type BoxerBout = typeof schema.boxerBouts.$inferSelect
export type NewBoxerBout = typeof schema.boxerBouts.$inferInsert
export type Division = typeof schema.divisions.$inferSelect
export type NewDivision = typeof schema.divisions.$inferInsert