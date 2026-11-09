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

test.describe('Receive STX from a Ledger Stacks multisig account', () => {
  test.beforeEach(async ({ extensionId, globalPage, onboardingPage, page }) => {
    await globalPage.setupAndUseApiCalls(extensionId);
    await mockStacksPolicyData(page, stacksPolicy.address);
    await onboardingPage.signInWithLedgerAccount(extensionId, {
      ...makeLedgerTestAccountWalletState(['stacks']),
      ...policyStateOverrides({ policies: [stacksPolicy], activePolicyId: stacksPolicy.id }),
    });
  });

  test('shows the multisig address and verifies it on the Ledger', async ({ homePage }) => {
    const address = await homePage.getReceiveStxAddress();
    test.expect(address).toEqual(stacksPolicy.address);

    const verifyButton = homePage.page.getByTestId(HomePageSelectors.ReceiveSheetVerifyAddressBtn);
    await test.expect(verifyButton).toBeVisible();
    await verifyButton.click();

    await test.expect(homePage.page.getByText('Connect & unlock your Ledger')).toBeVisible();
  });
});
