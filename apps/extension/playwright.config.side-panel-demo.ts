import { defineConfig, devices } from '@playwright/test';

const isSidePanelDemoRun = process.env.SIDE_PANEL_DEMO === 'true';

export default defineConfig({
  globalSetup: './tests/global-playwright-setup.js',
  testDir: './tests/specs/side-panel-demo',
  testIgnore: isSidePanelDemoRun ? [] : ['**/*'],
  timeout: 60 * 1000,
  expect: { timeout: 10000 },
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: 1,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
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
    reuseExistingServer: !process.env.CI,
  },
});
