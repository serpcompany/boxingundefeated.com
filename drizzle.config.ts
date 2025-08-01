import { defineConfig } from 'drizzle-kit'

export default defineConfig({
  dialect: 'sqlite',
  schema: './server/database/schema/index.ts',
  out: './server/database/migrations',
  casing: 'camelCase',
  dbCredentials: {
    url: './7b8799eb95f0bb5448e259812996a461ce40142dacbdea254ea597e307767f45.sqlite',
  },
})