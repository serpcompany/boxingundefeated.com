import { defineConfig } from 'vitest/config'

// Unit tests for the helpers only. The Playwright suite in tests/ needs a running site:
// `pnpm test:e2e`.
export default defineConfig({
  test: {
    include: ['src/**/*.test.ts']
  }
})
