import { defineConfig } from '@playwright/test';

import baseConfig from './playwright.config';

export default defineConfig({
  ...baseConfig,
  testDir: './tests/specs/side-panel-demo',
  testIgnore: [],
  fullyParallel: false,
  workers: 1,
});
