import { expect, test } from '@playwright/test';

test.describe('Page titles', () => {
  test('shows the not found title on an unknown route', async ({ page }) => {
    await page.goto('/does-not-exist');

    await expect(page).toHaveTitle('Page not found – Leather');
  });
});
