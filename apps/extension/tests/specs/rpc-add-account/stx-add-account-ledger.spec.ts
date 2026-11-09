import { expect } from '@playwright/test';
import type { TestRpcResponse } from '@tests/leather-provider';
import { exampleStacksMultisigPublicKeys } from '@tests/mocks/mock-policies';
import { makeLedgerTestAccountWalletState } from '@tests/page-object-models/onboarding.page';
import { ConnectAccountSelectors } from '@tests/selectors/requests.selectors';

import { test } from '../../fixtures/fixtures';

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
    const [popup] = await Promise.all([
      context.waitForEvent('page'),
      page.evaluate(
        params =>
          void window.LeatherProvider?.request('stx_addAccount', params).catch(
            (e: TestRpcResponse) => e
          ),
        {
          name: 'Shared treasury',
          publicKeys: exampleStacksMultisigPublicKeys,
          threshold: 2,
        }
      ),
    ]);

    await expect(popup.getByText('Verify multisig address')).toBeVisible({ timeout: 20_000 });
    const verifyButton = popup.getByTestId(ConnectAccountSelectors.StxAddAccountApproveBtn);
    await expect(verifyButton).toHaveText('Verify on Ledger');
    await expect(verifyButton).toBeEnabled();
    await verifyButton.click();

    await expect(popup.getByText('Connect & unlock your Ledger')).toBeVisible({
      timeout: 20_000,
    });
  });
});
