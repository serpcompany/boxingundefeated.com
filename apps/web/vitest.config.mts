import { configDefaults, defineConfig } from 'vitest/config'

// Tests run in Node. One that renders components or parses markup opts into happy-dom with a
// `// @vitest-environment happy-dom` first line. `.mts`: this package is CommonJS.
export default defineConfig({
  // tsconfig's `"jsx": "preserve"` leaves JSX to Next.js's compiler; tests compile it here.
  oxc: { jsx: { runtime: 'automatic' } },
  resolve: {
    alias: {
      '@': import.meta.dirname,
      // Next.js's build resolves `server-only` (lib/data/) to its own empty copy; so do tests.
      'server-only': 'next/dist/compiled/server-only/empty.js'
    }
  },
  test: {
    include: ['**/*.test.{ts,tsx}'],
    exclude: [...configDefaults.exclude, '.next/**', '.open-next/**'],
    setupFiles: ['./vitest.setup.ts'],
    clearMocks: true
  }
})
