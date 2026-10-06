import { readdirSync, readFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { convertV4MiniflareOptions, Miniflare } from 'miniflare'
import { createDatabase, type Database } from './client'

export const MIGRATIONS_DIR = resolve(import.meta.dirname, '../../../d1/drizzle')

/** Every checked-in migration, in the order Wrangler applies them, split into statements. */
export function readMigrations(): { name: string; statements: string[] }[] {
  return readdirSync(MIGRATIONS_DIR)
    .filter(file => file.endsWith('.sql'))
    .sort()
    .map(name => ({
      name,
      statements: readFileSync(join(MIGRATIONS_DIR, name), 'utf8')
        .split('--> statement-breakpoint')
        .map(statement => statement.trim())
        .filter(Boolean)
    }))
}

export interface RecordedStatement {
  sql: string
  params: unknown[]
}

export interface TestDatabase {
  binding: D1Database
  db: Database
  /** Every statement sent through `db`, with its bound values. */
  statements: RecordedStatement[]
  dispose(): Promise<void>
}

/**
 * An in-memory D1 in Miniflare (the same workerd SQLite that `wrangler dev` uses) with the
 * checked-in migrations applied, so tests exercise the real tables, indexes and foreign keys.
 */
export async function createTestDatabase(): Promise<TestDatabase> {
  const miniflare = new Miniflare(
    convertV4MiniflareOptions({
      modules: true,
      script: 'export default {}',
      compatibilityDate: '2026-10-01',
      d1Databases: { DB: 'test' }
    })
  )
  const binding = (await miniflare.getD1Database('DB')) as unknown as D1Database
  for (const migration of readMigrations()) {
    await binding.batch(migration.statements.map(statement => binding.prepare(statement)))
  }
  const statements: RecordedStatement[] = []
  return {
    binding,
    db: createDatabase(recordStatements(binding, statements)),
    statements,
    dispose: () => miniflare.dispose()
  }
}

function bindMethods<T extends object>(target: T, overrides: Partial<T>): T {
  return new Proxy(target, {
    get(object, property) {
      if (property in overrides) return overrides[property as keyof T]
      const value = Reflect.get(object, property)
      return typeof value === 'function' ? value.bind(object) : value
    }
  })
}

function recordStatements(binding: D1Database, log: RecordedStatement[]): D1Database {
  return bindMethods(binding, {
    prepare(sql: string) {
      const entry: RecordedStatement = { sql, params: [] }
      log.push(entry)
      const statement = binding.prepare(sql)
      return bindMethods(statement, {
        bind(...values: unknown[]) {
          entry.params = values
          return statement.bind(...values)
        }
      })
    }
  })
}

/** SQLite's plan for a recorded statement, one line per step. */
export async function explainQueryPlan(
  binding: D1Database,
  { sql, params }: RecordedStatement
): Promise<string[]> {
  const { results } = await binding
    .prepare(`EXPLAIN QUERY PLAN ${sql}`)
    .bind(...params)
    .all<{ detail: string }>()
  return results.map(row => row.detail)
}
