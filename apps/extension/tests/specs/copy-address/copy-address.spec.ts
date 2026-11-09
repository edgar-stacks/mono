import { HomePageSelectors } from '@tests/selectors/home.selectors';

import { test } from '../../fixtures/fixtures';

const taprootOptionTestId = `${HomePageSelectors.CopyAddressOption}btc-taproot`;
const stacksOptionTestId = `${HomePageSelectors.CopyAddressOption}stx`;

test.describe('Copy address menu', () => {
  test.beforeEach(async ({ extensionId, globalPage, onboardingPage }) => {
    await globalPage.setupAndUseApiCalls(extensionId);
    await onboardingPage.signInWithTestAccount(extensionId);
  });

  test('that it lists the account addresses in order', async ({ homePage, page }) => {
    await test
      .expect(page.getByTestId(HomePageSelectors.CopyAddressMenuBtn))
      .toHaveAccessibleName('Copy address');
    await homePage.openCopyAddressMenu();

    await test
      .expect(page.getByTestId(HomePageSelectors.CopyAddressMenuTitle))
      .toHaveText('Copy account address');
    const items = page.getByRole('menuitem');
    await test.expect(items).toHaveCount(3);
    await test
      .expect(items.nth(0))
      .toHaveAttribute('data-testid', `${HomePageSelectors.CopyAddressOption}btc-native-segwit`);
    await test.expect(items.nth(1)).toHaveAttribute('data-testid', taprootOptionTestId);
    await test.expect(items.nth(2)).toHaveAttribute('data-testid', stacksOptionTestId);
  });

  test('that it copies the Taproot address', async ({ homePage, page }) => {
    await homePage.openCopyAddressMenu();
    await page.getByTestId(taprootOptionTestId).click();

    await test.expect(page.getByText('Copied to clipboard!', { exact: true })).toBeVisible();
    await test.expect
      .poll(() => page.evaluate(() => navigator.clipboard.readText()))
      .toMatch(/^bc1p/);
  });

  test('that it copies the Stacks address', async ({ homePage, page }) => {
    await homePage.openCopyAddressMenu();
    await page.getByTestId(stacksOptionTestId).click();

    await test.expect(page.getByText('Copied to clipboard!', { exact: true })).toBeVisible();
    await test.expect
      .poll(() => page.evaluate(() => navigator.clipboard.readText()))
      .toMatch(/^SP/);
  });

  test('that it shows an error when the clipboard write fails', async ({ homePage, page }) => {
    await page.evaluate(() => {
      navigator.clipboard.writeText = () => Promise.reject(new Error('Clipboard unavailable'));
    });
    await homePage.openCopyAddressMenu();
    await page.getByTestId(stacksOptionTestId).click();

    await test.expect(page.getByText('Failed to copy address', { exact: true })).toBeVisible();
    await test.expect(page.getByText('Copied to clipboard!', { exact: true })).toBeHidden();
  });
});
