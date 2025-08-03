export default defineEventHandler(async () => {
  const db = useD1?.()
  const testDiv = db
    ? await db.prepare("SELECT slug, shortName FROM divisions LIMIT 3").all().catch(e => e.message)
    : 'D1 not bound'

  return {
    commit: process.env.CF_PAGES_COMMIT_SHA || 'unknown',
    hubEnv: process.env.NUXT_HUB_ENV,
    runtime: useRuntimeConfig(),
    d1Check: testDiv
  }
})