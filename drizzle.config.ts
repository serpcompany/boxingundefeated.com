import { defineConfig } from 'drizzle-kit'

// Generates reviewed, forward-only migrations into d1/drizzle/. Wrangler applies them to each D1
// (`pnpm db:migrate:<env>`); never `drizzle-kit push`.
export default defineConfig({
  dialect: 'sqlite',
  out: './d1/drizzle',
  schema: './packages/data-ops/src/schema.ts',
  strict: true,
  verbose: true
})
