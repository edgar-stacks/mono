import { HomePageSelectors } from '@tests/selectors/home.selectors';

import { test } from '../../fixtures/fixtures';

function readClipboard() {
  return navigator.clipboard.readText();
}

test.describe('Copy address menu', () => {
  test.beforeEach(async ({ extensionId, globalPage, onboardingPage }) => {
    await globalPage.setupAndUseApiCalls(extensionId);
    await onboardingPage.signInWithTestAccount(extensionId);
  });

  test('that the menu lists the account addresses', async ({ homePage, page }) => {
    await homePage.openCopyAddressMenu();

    await test
      .expect(page.getByTestId(HomePageSelectors.CopyAddressMenuTitle))
      .toHaveText('Copy account address');
    const options = page.getByRole('menuitem');
    await test.expect(options).toHaveCount(3);
    await test.expect(options).toContainText(['Native SegWit', 'Taproot', 'Stacks']);
  });

  test('that choosing Taproot copies its address', async ({ homePage, page }) => {
    await homePage.copyAddressFromMenu('btc-taproot');

    await test.expect(page.getByText('Copied to clipboard!', { exact: true })).toBeVisible();
    await test.expect.poll(() => page.evaluate(readClipboard)).toMatch(/^bc1p/);
  });

  test('that choosing Stacks copies its address', async ({ homePage, page }) => {
    await homePage.copyAddressFromMenu('stx');

    await test.expect(page.getByText('Copied to clipboard!', { exact: true })).toBeVisible();
    await test.expect.poll(() => page.evaluate(readClipboard)).toMatch(/^SP/);
  });

  test('that a failed clipboard write shows an error', async ({ homePage, page }) => {
    await page.evaluate(() => {
      navigator.clipboard.writeText = () => Promise.reject(new Error('Clipboard unavailable'));
    });

    await homePage.copyAddressFromMenu('stx');

    await test.expect(page.getByText('Failed to copy address', { exact: true })).toBeVisible();
    await test.expect(page.getByText('Copied to clipboard!', { exact: true })).toBeHidden();
  });
});
