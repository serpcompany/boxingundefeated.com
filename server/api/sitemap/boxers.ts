import { defineEventHandler } from 'h3'
import { useDrizzle } from '~/server/utils/drizzle'
import { boxers } from '~/server/database/schema'

export default defineEventHandler(async () => {
  const db = useDrizzle()
  const allBoxers = await db.select().from(boxers)
  return allBoxers.map(b => `/boxers/${b.slug}`)
})
