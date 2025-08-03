import { defineConfig } from 'drizzle-kit'

// Determine which environment to use
const environment = process.env.DRIZZLE_ENV || 'local' // local, preview, production

let dbCredentials
if (environment === 'local') {
  // Local SQLite configuration
  dbCredentials = {
    url: process.env.DRIZZLE_URL_LOCAL || ''
  }
} else {
  // Remote D1 configuration
  const databaseId = environment === 'preview' 
    ? process.env.D1_PREVIEW_DATABASE_ID! 
    : process.env.D1_DATABASE_ID!
    
  dbCredentials = {
    accountId: process.env.CLOUDFLARE_ACCOUNT_ID!,
    databaseId: databaseId,
    token: process.env.CLOUDFLARE_D1_TOKEN!,
  }
}

export default defineConfig({
  dialect: 'sqlite',
  schema: './server/db/schema/index.ts',
  out: './server/db/migrations',
  ...(environment !== 'local' ? { driver: 'd1-http' } : {}),
  dbCredentials
})