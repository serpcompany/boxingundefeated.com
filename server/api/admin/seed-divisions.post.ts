// server/api/admin/seed-divisions.post.ts
import { seedDivisions } from '~/server/tasks/seed-divisions' // adjust this import if needed

export default defineEventHandler(async (event) => {
  if (getMethod(event) !== 'POST') return createError({ statusCode: 405 })
  await seedDivisions()
  return { success: true }
})