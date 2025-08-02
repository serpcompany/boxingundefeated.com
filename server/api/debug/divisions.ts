export default defineEventHandler(async () => {
  try {
    const db = useD1()
    const result = await db.prepare(`SELECT slug, shortName FROM divisions LIMIT 5`).all()
    return { result }
  } catch (err) {
    return { error: err.message }
  }
})