import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  globalSetup: './tests/global-playwright-setup.js',
  testDir: './tests/specs/side-panel-demo',
  timeout: 30 * 1000,
  expect: { timeout: 5000 },
  fullyParallel: false,
  workers: 1,
  reporter: [['list']],
  use: {
    headless: false,
    trace: 'retain-on-failure',
    timezoneId: 'UTC',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: 'pnpm dev:test-app',
    port: 3000,
    timeout: 15000,
    reuseExistingServer: true,
  },
});
