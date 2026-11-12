import { HomePageSelectors } from '@tests/selectors/home.selectors';

import { WalletDefaultNetworkConfigurationIds } from '@leather.io/models';

import { test } from '../../fixtures/fixtures';

const addressCopiedToast = 'Address copied to clipboard';

test.describe('Receive Dialog', () => {
  test.describe.configure({ retries: 0 });

  test.beforeEach(async ({ extensionId, globalPage, onboardingPage }) => {
    await globalPage.setupAndUseApiCalls(extensionId);
    await onboardingPage.signInWithTestAccount(extensionId);
  });

  test('That the Receive dialog renders and shows the correct assets', async ({ homePage }) => {
    await homePage.goToReceiveDialog();

    const dialog = homePage.page.getByRole('dialog');
    await test.expect(dialog.getByText('Choose asset')).toBeVisible();
    await test.expect(dialog.getByText('Tokens')).toBeVisible();
    await test.expect(dialog.getByText('Collectibles')).toBeVisible();
    await test.expect(dialog.getByText('Bitcoin (BTC)')).toBeVisible();
    await test.expect(dialog.getByText('Bitcoin Taproot')).toBeVisible();
    await test.expect(dialog.getByText('Stacks')).toBeVisible();
    await test.expect(dialog.getByTestId(HomePageSelectors.ReceiveNetworkBadge)).toBeHidden();
  });

  test('that copying from the tokens list shows the address copied toast', async ({ homePage }) => {
    await homePage.goToReceiveDialog();
    await homePage.page.getByTestId(HomePageSelectors.ReceiveBtcNativeSegwitCopyBtn).click();
    await test.expect(homePage.page.getByText(addressCopiedToast, { exact: true })).toBeVisible();
  });

  test('that copying from the collectibles tab shows the address copied toast', async ({
    homePage,
  }) => {
    await homePage.goToReceiveDialog();
    await homePage.page.getByTestId(HomePageSelectors.ReceiveCollectiblesTab).click();
    await homePage.page.getByTestId(HomePageSelectors.ReceiveStacksNftCopyBtn).click();
    await test.expect(homePage.page.getByText(addressCopiedToast, { exact: true })).toBeVisible();
  });

  test('that copying from the BTC QR code shows the address copied toast', async ({ homePage }) => {
    await homePage.goToReceiveDialog();
    await homePage.page.getByTestId(HomePageSelectors.ReceiveBtcNativeSegwitQrCodeBtn).click();
    await homePage.page.getByRole('button', { name: 'Copy address' }).click();
    await test.expect(homePage.page.getByText(addressCopiedToast, { exact: true })).toBeVisible();
  });

  test('that copying from the STX QR code shows the address copied toast', async ({ homePage }) => {
    await homePage.goToReceiveDialog();
    await homePage.page.getByTestId(HomePageSelectors.ReceiveStxQrCodeBtn).click();
    await homePage.page.getByRole('button', { name: 'Copy address' }).click();
    await test.expect(homePage.page.getByText(addressCopiedToast, { exact: true })).toBeVisible();
  });

  test('that the Receive dialog shows the network on testnet', async ({
    homePage,
    networkPage,
  }) => {
    await networkPage.changeNetwork(WalletDefaultNetworkConfigurationIds.testnet4);
    await homePage.goToReceiveDialog();

    const networkBadge = homePage.page.getByTestId(HomePageSelectors.ReceiveNetworkBadge);
    await test.expect(networkBadge).toHaveText('Testnet4');

    await homePage.page.getByTestId(HomePageSelectors.ReceiveBtcNativeSegwitQrCodeBtn).click();
    await test.expect(homePage.page.getByRole('button', { name: 'Copy address' })).toBeVisible();
    await test.expect(networkBadge).toHaveText('Testnet4');
  });

  test('that the STX QR code shows the network on testnet', async ({ homePage, networkPage }) => {
    await networkPage.changeNetwork(WalletDefaultNetworkConfigurationIds.testnet4);
    await homePage.goToReceiveDialog();
    await homePage.page.getByTestId(HomePageSelectors.ReceiveStxQrCodeBtn).click();
    await test.expect(homePage.page.getByRole('button', { name: 'Copy address' })).toBeVisible();
    await test
      .expect(homePage.page.getByTestId(HomePageSelectors.ReceiveNetworkBadge))
      .toHaveText('Testnet4');
  });
});
