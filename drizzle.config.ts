import { defineConfig } from 'drizzle-kit'

export default defineConfig({
  dialect: 'sqlite',
  schema: './server/database/schema/index.ts',
  out: './server/database/migrations',
  casing: 'snake_case',
})