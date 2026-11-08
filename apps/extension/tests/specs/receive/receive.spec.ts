import { HomePageSelectors } from '@tests/selectors/home.selectors';

import { test } from '../../fixtures/fixtures';

test.describe('Receive Dialog', () => {
  test.describe.configure({ retries: 0 });

  test('That the Receive dialog renders and shows the correct assets', async ({
    extensionId,
    globalPage,
    onboardingPage,
    homePage,
  }) => {
    await globalPage.setupAndUseApiCalls(extensionId);
    await onboardingPage.signInWithTestAccount(extensionId);
    await homePage.goToReceiveDialog();

    const dialog = homePage.page.getByRole('dialog');
    await test.expect(dialog.getByText('Choose asset')).toBeVisible();
    await test.expect(dialog.getByText('Tokens')).toBeVisible();
    await test.expect(dialog.getByText('Collectibles')).toBeVisible();
    await test.expect(dialog.getByText('Bitcoin (BTC)')).toBeVisible();
    await test.expect(dialog.getByText('Bitcoin Taproot')).toBeVisible();
    await test.expect(dialog.getByText('Stacks')).toBeVisible();
  });

  test('That copying the address on the Collectibles tab shows the address copied toast', async ({
    extensionId,
    globalPage,
    onboardingPage,
    homePage,
  }) => {
    await globalPage.setupAndUseApiCalls(extensionId);
    await onboardingPage.signInWithTestAccount(extensionId);
    await homePage.goToReceiveDialog();

    await homePage.page.getByTestId(HomePageSelectors.ReceiveCollectiblesTab).click();
    await homePage.page.getByTestId(HomePageSelectors.ReceiveStxNftCopyBtn).click();

    await test
      .expect(homePage.page.getByText('Address copied to clipboard', { exact: true }))
      .toBeVisible();
  });
});
