import { defineConfig, devices } from '@playwright/test'
import { resolveTarget } from './src/target'

// BASE_URL and EXPECT_ENV pick the site and the configuration it must show (src/target.ts).
const target = resolveTarget(process.env)
const isCI = !!process.env.CI

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: isCI,
  // No retries: a flaky result must fail the gate. The host check, which waits for a deploy to
  // reach every edge, retries on its own (tests/hosts.spec.ts).
  retries: 0,
  // A deployed environment is a shared, live site: keep the load small.
  workers: target.isLocal ? undefined : 4,
  reporter: [['list'], ['html', { open: 'never' }]],
  timeout: 60_000,
  expect: { timeout: 10_000 },
  use: {
    baseURL: target.baseUrl,
    extraHTTPHeaders: target.headers,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure'
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  // Without BASE_URL: the local Worker preview of the last `pnpm build:worker`, reused when one is
  // already running on its port.
  webServer: process.env.BASE_URL
    ? undefined
    : {
        command: 'pnpm --filter web serve:worker',
        cwd: '../..',
        url: `${target.baseUrl}/robots.txt`,
        reuseExistingServer: true,
        timeout: 180_000
      }
})
