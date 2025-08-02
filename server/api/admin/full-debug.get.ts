// server/api/admin/d1-debug.get.ts
export default defineEventHandler(async (event) => {
  try {
    // Cloudflare Pages Functions expose the binding here:
    const db = event.context.cloudflare?.env?.DB
    if (!db) return { error: "No D1 DB binding found (event.context.cloudflare.env.DB is undefined)" }

    const { results } = await db.prepare("SELECT * FROM divisions LIMIT 3").all()
    return { results }
  } catch (e) {
    return { error: e.message, stack: e.stack }
  }
})