import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    // Each suite starts Miniflare (workerd) for an in-memory D1.
    hookTimeout: 60_000,
    testTimeout: 30_000
  }
})
