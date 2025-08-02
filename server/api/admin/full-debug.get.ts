export default defineEventHandler(async () => {
  let d1Test, boxersTest, divisionsTest, boutsTest
  try {
    const db = useD1?.()
    if (db) {
      divisionsTest = await db.prepare("SELECT * FROM divisions LIMIT 3").all().catch(e => e.message)
      boxersTest = await db.prepare("SELECT * FROM boxers LIMIT 3").all().catch(e => e.message)
      boutsTest = await db.prepare("SELECT * FROM boxer_bouts LIMIT 3").all().catch(e => e.message)
    }
  } catch (e) {
    d1Test = e.message
  }
  return {
    commit: process.env.CF_PAGES_COMMIT_SHA || 'unknown',
    env: {
      NUXT_HUB_ENV: process.env.NUXT_HUB_ENV,
      CLOUDFLARE_D1_TOKEN: process.env.CLOUDFLARE_D1_TOKEN ? 'present' : 'missing',
      CLOUDFLARE_ACCOUNT_ID: process.env.CLOUDFLARE_ACCOUNT_ID ? 'present' : 'missing',
    },
    runtimeConfig: useRuntimeConfig(),
    divisionsTest,
    boxersTest,
    boutsTest,
    d1Test
  }
})