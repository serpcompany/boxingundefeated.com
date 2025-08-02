export default defineEventHandler((event) => {
  return {
    nodeEnv: process.env.NODE_ENV,
    nuxtHubEnv: process.env.NUXT_HUB_ENV,
    projectKey: process.env.NUXT_HUB_PROJECT_KEY,
    deployToken: process.env.NUXT_HUB_PROJECT_DEPLOY_TOKEN,
    seedKey: process.env.SEED_SECRET_KEY,
    runtime: useRuntimeConfig()
  }
})