import { type DrizzleD1Database, drizzle } from 'drizzle-orm/d1'
import * as schema from './schema'

export type Database = DrizzleD1Database<typeof schema>

/** Wrap a D1 binding, such as `env.DB`, for the queries in this package. */
export function createDatabase(binding: D1Database): Database {
  return drizzle(binding, { schema })
}
