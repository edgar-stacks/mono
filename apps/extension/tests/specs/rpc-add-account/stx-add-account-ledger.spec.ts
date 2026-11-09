import { type Page, expect } from '@playwright/test';
import { exampleStacksMultisigPublicKeys } from '@tests/mocks/mock-policies';
import { makeLedgerTestAccountWalletState } from '@tests/page-object-models/onboarding.page';
import { ConnectAccountSelectors } from '@tests/selectors/requests.selectors';

import { test } from '../../fixtures/fixtures';

function openStxAddAccount(page: Page) {
  return page.evaluate(
    ({ publicKeys }) =>
      void window.LeatherProvider?.request('stx_addAccount', {
        name: 'Shared treasury',
        publicKeys,
        threshold: 2,
      }).catch((e: unknown) => e),
    { publicKeys: exampleStacksMultisigPublicKeys }
  );
}

test.describe('Rpc: stx_addAccount from a Ledger wallet', () => {
  test.beforeEach(async ({ extensionId, globalPage, onboardingPage, page }) => {
    await globalPage.setupAndUseApiCalls(extensionId);
    await onboardingPage.signInWithLedgerAccount(
      extensionId,
      makeLedgerTestAccountWalletState(['stacks'])
    );
    await page.goto('localhost:3000');
  });

  test('verifies the multisig address on the Ledger', async ({ page, context }) => {
    const [popup] = await Promise.all([context.waitForEvent('page'), openStxAddAccount(page)]);

    await expect(popup.getByText('Verify multisig address')).toBeVisible();
    const verifyButton = popup.getByTestId(ConnectAccountSelectors.StxAddAccountApproveBtn);
    await expect(verifyButton).toHaveText('Verify on Ledger');
    await expect(verifyButton).toBeEnabled();
    await verifyButton.click();

    await expect(popup.getByText('Connect & unlock your Ledger')).toBeVisible();
  });
});
