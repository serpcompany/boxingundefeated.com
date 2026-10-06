/**
 * The Worker's D1 database, for the queries in `lib/data/`. Server-only.
 *
 * The only way the app reaches D1: the `DB` binding from `getCloudflareContext()`, wrapped by
 * `@boxingundefeated/data-ops`, which owns every query (prepared statements, bound values). It
 * fails closed: without the binding, or without a known `SITE_ENVIRONMENT`, a read throws, so a
 * misconfigured Worker answers with an error instead of rendering a page from the wrong data.
 */
import 'server-only'

import { createDatabase, type Database } from '@boxingundefeated/data-ops'
import { getCloudflareContext } from '@opennextjs/cloudflare'
import { cache } from 'react'
import { parseSiteEnvironment } from '../site-config'

/** The Worker bindings the data layer reads (`wrangler.jsonc`). */
export interface DataBindings {
  DB?: D1Database
  SITE_ENVIRONMENT?: string
}

export class DataBindingError extends Error {
  override name = 'DataBindingError'
}

/** The `DB` binding, or a `DataBindingError` when it or `SITE_ENVIRONMENT` is missing. */
export function requireDatabaseBinding(env: DataBindings): D1Database {
  if (!env.DB) {
    throw new DataBindingError('The D1 binding DB is missing; data reads fail closed.')
  }
  if (!parseSiteEnvironment(env.SITE_ENVIRONMENT)) {
    throw new DataBindingError(
      `SITE_ENVIRONMENT is ${JSON.stringify(env.SITE_ENVIRONMENT ?? null)}, not local, staging ` +
        'or production; data reads fail closed.'
    )
  }
  return env.DB
}

/** One database handle per request. */
export const getDatabase = cache(async (): Promise<Database> => {
  const { env } = await getCloudflareContext({ async: true })
  return createDatabase(requireDatabaseBinding(env as DataBindings))
})
