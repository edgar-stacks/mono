import {
  exampleStacksMultisigPublicKeys,
  makeStacksPolicy,
  policyStateOverrides,
} from '@tests/mocks/mock-policies';
import { mockStacksPolicyData } from '@tests/mocks/mock-policy-data';
import { makeLedgerTestAccountWalletState } from '@tests/page-object-models/onboarding.page';
import { HomePageSelectors } from '@tests/selectors/home.selectors';
import { SharedComponentsSelectors } from '@tests/selectors/shared-component.selectors';

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

test.describe('Receive STX with a Ledger Stacks multisig active', () => {
  test.beforeEach(async ({ extensionId, globalPage, onboardingPage, page }) => {
    await globalPage.setupAndUseApiCalls(extensionId);
    await mockStacksPolicyData(page, stacksPolicy.address);
    await onboardingPage.signInWithLedgerAccount(extensionId, {
      ...makeLedgerTestAccountWalletState(['stacks']),
      ...policyStateOverrides({ policies: [stacksPolicy], activePolicyId: stacksPolicy.id }),
    });
  });

  test('shows the multisig address and verifies it on the Ledger', async ({ homePage }) => {
    await homePage.goToReceiveDialog();

    const addressDisplayer = homePage.page.getByTestId(SharedComponentsSelectors.AddressDisplayer);
    await test.expect(addressDisplayer).toBeVisible();
    test
      .expect((await addressDisplayer.innerText()).replaceAll('\n', ''))
      .toEqual(stacksPolicy.address);

    const verifyButton = homePage.page.getByTestId(HomePageSelectors.ReceiveSheetVerifyAddressBtn);
    await test.expect(verifyButton).toBeVisible();
    await verifyButton.click();

    await test.expect(homePage.page.getByText('Connect & unlock your Ledger')).toBeVisible();
  });
});
