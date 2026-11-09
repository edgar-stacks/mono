import { HomePageSelectors } from '@tests/selectors/home.selectors';

import { test } from '../../fixtures/fixtures';

const copiedToClipboardMessage = 'Copied to clipboard!';
const failedToCopyMessage = 'Failed to copy address';

test.describe('Copy address menu', () => {
  test.beforeEach(async ({ extensionId, globalPage, onboardingPage }) => {
    await globalPage.setupAndUseApiCalls(extensionId);
    await onboardingPage.signInWithTestAccount(extensionId);
  });

  test('that it lists the account addresses', async ({ homePage }) => {
    await homePage.openCopyAddressMenu();

    await test
      .expect(homePage.page.getByTestId(HomePageSelectors.CopyAddressMenuTitle))
      .toHaveText('Copy account address');
    await test
      .expect(homePage.page.getByTestId(`${HomePageSelectors.CopyAddressOption}btc-native-segwit`))
      .toBeVisible();
    await test
      .expect(homePage.page.getByTestId(`${HomePageSelectors.CopyAddressOption}btc-taproot`))
      .toBeVisible();
    await test
      .expect(homePage.page.getByTestId(`${HomePageSelectors.CopyAddressOption}stx`))
      .toBeVisible();
  });

  test('that it copies the Taproot address', async ({ homePage }) => {
    await homePage.openCopyAddressMenu();
    await homePage.page.getByTestId(`${HomePageSelectors.CopyAddressOption}btc-taproot`).click();

    await test
      .expect(homePage.page.getByText(copiedToClipboardMessage, { exact: true }))
      .toBeVisible();
    await test.expect
      .poll(() => homePage.page.evaluate(() => navigator.clipboard.readText()))
      .toMatch(/^bc1p/);
  });

  test('that it copies the Stacks address', async ({ homePage }) => {
    await homePage.openCopyAddressMenu();
    await homePage.page.getByTestId(`${HomePageSelectors.CopyAddressOption}stx`).click();

    await test
      .expect(homePage.page.getByText(copiedToClipboardMessage, { exact: true }))
      .toBeVisible();
    await test.expect
      .poll(() => homePage.page.evaluate(() => navigator.clipboard.readText()))
      .toMatch(/^SP/);
  });

  test('that it shows an error when the clipboard write fails', async ({ homePage }) => {
    await homePage.page.evaluate(() => {
      navigator.clipboard.writeText = () => Promise.reject(new Error('Clipboard unavailable'));
    });
    await homePage.openCopyAddressMenu();
    await homePage.page.getByTestId(`${HomePageSelectors.CopyAddressOption}stx`).click();

    await test.expect(homePage.page.getByText(failedToCopyMessage, { exact: true })).toBeVisible();
    await test
      .expect(homePage.page.getByText(copiedToClipboardMessage, { exact: true }))
      .toBeHidden();
  });
});
