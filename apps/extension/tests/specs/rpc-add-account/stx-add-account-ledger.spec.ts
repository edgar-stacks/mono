import { type BrowserContext, type Page, expect } from '@playwright/test';
import { exampleStacksMultisigPublicKeys } from '@tests/mocks/mock-policies';
import { makeLedgerTestAccountWalletState } from '@tests/page-object-models/onboarding.page';
import { ConnectAccountSelectors } from '@tests/selectors/requests.selectors';

import { test } from '../../fixtures/fixtures';

async function initiateRequest(page: Page, method: string, params: unknown) {
  return page.evaluate(({ method, params }) => window.LeatherProvider?.request(method, params), {
    method,
    params,
  });
}

async function waitForPopup(context: BrowserContext) {
  const popup = await context.waitForEvent('page');
  await popup.waitForLoadState('domcontentloaded');
  return popup;
}

test.describe('Rpc: stx_addAccount from a Ledger wallet', () => {
  test.beforeEach(async ({ extensionId, globalPage, onboardingPage }) => {
    await globalPage.setupAndUseApiCalls(extensionId);
    await onboardingPage.signInWithLedgerAccount(
      extensionId,
      makeLedgerTestAccountWalletState(['stacks'])
    );
  });

  test('verifies the multisig address on the Ledger', async ({ page, context }) => {
    await page.goto('localhost:3000');
    void initiateRequest(page, 'stx_addAccount', {
      name: 'Shared treasury',
      publicKeys: exampleStacksMultisigPublicKeys,
      threshold: 2,
    }).catch(() => undefined);

    const popup = await waitForPopup(context);
    await expect(popup.getByText('Verify multisig address')).toBeVisible();
    const verifyButton = popup.getByTestId(ConnectAccountSelectors.StxAddAccountApproveBtn);
    await expect(verifyButton).toHaveText('Verify on Ledger');
    await expect(verifyButton).toBeEnabled();
    await verifyButton.click();

    await expect(popup.getByText('Connect & unlock your Ledger')).toBeVisible();
  });
});
