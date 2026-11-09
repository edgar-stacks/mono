import { expect } from '@playwright/test';
import {
  exampleStacksMultisigPublicKeys,
  makeStacksPolicy,
  policyStateOverrides,
} from '@tests/mocks/mock-policies';
import { mockStacksPolicyData } from '@tests/mocks/mock-policy-data';
import { makeLedgerTestAccountWalletState } from '@tests/page-object-models/onboarding.page';
import { HomePageSelectors } from '@tests/selectors/home.selectors';

import { deriveStxMultisigAddress } from '@leather.io/stacks';

import { test } from '../../fixtures/fixtures';

const mainnetChainId = 1;
const stacksPolicy = makeStacksPolicy({
  address: deriveStxMultisigAddress({
    publicKeys: exampleStacksMultisigPublicKeys,
    threshold: 2,
    chainId: mainnetChainId,
  }),
});

test.describe('Receive STX for a Ledger Stacks multisig', () => {
  test.beforeEach(async ({ extensionId, globalPage, onboardingPage, page }) => {
    await globalPage.setupAndUseApiCalls(extensionId);
    await mockStacksPolicyData(page, stacksPolicy.address);
    await onboardingPage.signInWithLedgerAccount(extensionId, {
      ...makeLedgerTestAccountWalletState(['stacks']),
      ...policyStateOverrides({ policies: [stacksPolicy], activePolicyId: stacksPolicy.id }),
    });
  });

  test('verifies the multisig address on the Ledger', async ({ homePage, page }) => {
    expect(await homePage.getReceiveStxAddress()).toEqual(stacksPolicy.address);

    const verifyButton = page.getByTestId(HomePageSelectors.ReceiveSheetVerifyAddressBtn);
    await expect(verifyButton).toBeVisible();
    await verifyButton.click();

    await expect(page.getByText('Connect & unlock your Ledger')).toBeVisible({ timeout: 20_000 });
  });
});
