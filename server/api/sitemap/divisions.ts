import { defineEventHandler } from 'h3'
import { useDrizzle } from '~/server/utils/drizzle'
import { divisions } from '~/server/database/schema'

export default defineEventHandler(async () => {
  const db = useDrizzle()
  const allDivisions = await db.select().from(divisions)
  return allDivisions.map(d => `/divisions/${d.slug}`)
})
