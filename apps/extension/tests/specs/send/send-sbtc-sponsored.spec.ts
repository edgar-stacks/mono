import { expect } from '@playwright/test';
import { deserializeTransaction } from '@stacks/transactions';
import { TEST_ACCOUNT_2_STX_ADDRESS } from '@tests/mocks/constants';
import { mockSbtcSponsorshipRequests } from '@tests/mocks/mock-sbtc';
import { mockZeroStxBalanceV2Request } from '@tests/mocks/mock-stacks-balances-v2';
import { SendCryptoAssetSelectors } from '@tests/selectors/send.selectors';
import { SharedComponentsSelectors } from '@tests/selectors/shared-component.selectors';
import { expectToSettleAt } from '@tests/utils';
import BigNumber from 'bignumber.js';

import { getSbtcSponsoredTransferDetails } from '@leather.io/stacks';
import { assertExistence } from '@leather.io/utils';

import { test } from '../../fixtures/fixtures';
import type { HomePage } from '../../page-object-models/home.page';
import type { OnboardingPage } from '../../page-object-models/onboarding.page';
import type { SendPage } from '../../page-object-models/send.page';

const sbtcTokenTestId = 'SM3VDXK3WZZSA84XXFKAFAF15NNZX32CTSG82JFQ4.sbtc-token::sbtc';
const amount = '0.0001';

function sbtcFeeLabelToSats(label: string | null) {
  assertExistence(label, 'Fee label has no text');
  return BigInt(new BigNumber(label.replace('sBTC', '').trim()).shiftedBy(8).toFixed());
}

function decodeSubmittedTransaction(transaction: string) {
  const details = getSbtcSponsoredTransferDetails(deserializeTransaction(transaction));
  assertExistence(details, 'Submitted transaction is not a sponsored sBTC transfer');
  return details;
}

interface OpenSbtcSendFormArgs {
  extensionId: string;
  homePage: HomePage;
  onboardingPage: OnboardingPage;
  sendPage: SendPage;
}

async function openSbtcSendForm({
  extensionId,
  homePage,
  onboardingPage,
  sendPage,
}: OpenSbtcSendFormArgs) {
  await onboardingPage.signInWithTestAccount(extensionId);
  await homePage.sendButton.click();
  await sendPage.selectSip10AndGoToSendForm(sbtcTokenTestId);
}

test.describe('Send sBTC with a sponsored fee', () => {
  test.beforeEach(async ({ extensionId, globalPage }) => {
    await globalPage.setupAndUseApiCalls(extensionId);
  });

  test('pays the fee in STX when the account holds enough STX', async ({
    homePage,
    onboardingPage,
    sendPage,
    extensionId,
  }) => {
    await openSbtcSendForm({ extensionId, homePage, onboardingPage, sendPage });

    await expect(sendPage.feeToBePaid).toContainText('STX');
    await expect(
      sendPage.page.getByTestId(SharedComponentsSelectors.SponsoredFeeBadge)
    ).toHaveCount(0);
  });

  test.describe('with no STX', () => {
    test.beforeEach(async ({ context }) => {
      await mockZeroStxBalanceV2Request(context);
    });

    test('shows sBTC fee tiers with a sponsored badge and no custom fee', async ({
      extensionId,
      homePage,
      onboardingPage,
      sendPage,
    }) => {
      await openSbtcSendForm({ extensionId, homePage, onboardingPage, sendPage });

      await expect(sendPage.feeToBePaid).toContainText('sBTC');
      await expect(
        sendPage.page.getByTestId(SharedComponentsSelectors.SponsoredFeeBadge)
      ).toBeVisible();

      await sendPage.page.getByTestId(SharedComponentsSelectors.MiddleFeeEstimateItem).click();
      await expect(
        sendPage.page.getByTestId(SharedComponentsSelectors.HighFeeEstimateItem)
      ).toBeVisible();
      await expect(
        sendPage.page.getByTestId(SharedComponentsSelectors.CustomFeeSelectItem)
      ).toHaveCount(0);
    });

    test('submits the quote with the selected tier fee and never broadcasts through Hiro', async ({
      context,
      extensionId,
      homePage,
      onboardingPage,
      sendPage,
    }) => {
      const { submitRequests } = await mockSbtcSponsorshipRequests(context);
      const hiroBroadcasts: string[] = [];
      await context.route('**/v2/transactions', route => {
        hiroBroadcasts.push(route.request().url());
        return route.abort();
      });
      await openSbtcSendForm({ extensionId, homePage, onboardingPage, sendPage });

      const standardFeeSats = sbtcFeeLabelToSats(await sendPage.feeToBePaid.textContent());
      await sendPage.page.getByTestId(SharedComponentsSelectors.MiddleFeeEstimateItem).click();
      await sendPage.page.getByTestId(SharedComponentsSelectors.HighFeeEstimateItem).click();
      await expect
        .poll(async () => sbtcFeeLabelToSats(await sendPage.feeToBePaid.textContent()))
        .toBeGreaterThan(standardFeeSats);
      const highTierFeeSats = sbtcFeeLabelToSats(await sendPage.feeToBePaid.textContent());

      await sendPage.amountInput.fill(amount);
      await sendPage.recipientInput.fill(TEST_ACCOUNT_2_STX_ADDRESS);
      await sendPage.recipientInput.blur();
      await sendPage.previewSendTxButton.click();
      await expect(sendPage.confirmationDetails).toBeVisible();
      await expect(sendPage.confirmationDetails).toContainText('Total spend');
      await expect(sendPage.feesRow).toContainText('sBTC');

      await sendPage.confirmSendTransaction();
      await expect(sendPage.page.getByText('Sent')).toBeVisible();

      expect(submitRequests).toHaveLength(1);
      expect(submitRequests[0].quoteId).toEqual('quote-1');
      expect(decodeSubmittedTransaction(submitRequests[0].transaction).fee).toEqual(
        highTierFeeSats
      );
      await expectToSettleAt(() => Promise.resolve(hiroBroadcasts.length), 0);
    });

    test('re-quotes an expired quote and submits on the second confirm', async ({
      context,
      extensionId,
      homePage,
      onboardingPage,
      sendPage,
    }) => {
      const { submitRequests } = await mockSbtcSponsorshipRequests(context, {
        rejectFirstSubmitWithCode: 'quote_expired',
      });
      await openSbtcSendForm({ extensionId, homePage, onboardingPage, sendPage });

      await sendPage.amountInput.fill(amount);
      await sendPage.recipientInput.fill(TEST_ACCOUNT_2_STX_ADDRESS);
      await sendPage.recipientInput.blur();
      await sendPage.previewSendTxButton.click();
      await expect(sendPage.confirmationDetails).toBeVisible();

      await sendPage.confirmSendTransaction();
      await expect(
        sendPage.page.getByTestId(SendCryptoAssetSelectors.SbtcFeeRequoteCallout)
      ).toBeVisible();
      await expect(sendPage.page.getByText('Fee quote updated')).toBeVisible();

      await sendPage.confirmSendTransaction();
      await expect(sendPage.page.getByText('Sent')).toBeVisible();

      expect(submitRequests).toHaveLength(2);
      expect(submitRequests[1].quoteId).not.toEqual(submitRequests[0].quoteId);
    });

    test('shows insufficient balance when the amount cannot cover the fee', async ({
      extensionId,
      homePage,
      onboardingPage,
      sendPage,
    }) => {
      await openSbtcSendForm({ extensionId, homePage, onboardingPage, sendPage });
      await sendPage.amountInput.fill('0.5');
      await sendPage.recipientInput.fill(TEST_ACCOUNT_2_STX_ADDRESS);
      await sendPage.recipientInput.blur();
      await sendPage.previewSendTxButton.click();

      await expect(sendPage.amountInputErrorLabel).toContainText('Insufficient balance');
    });
  });
});
