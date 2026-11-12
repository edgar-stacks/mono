import { type Page, expect } from '@playwright/test';
import { deserializeTransaction } from '@stacks/transactions';
import { TEST_ACCOUNT_2_STX_ADDRESS } from '@tests/mocks/constants';
import {
  createSbtcSponsorshipQuoteFixture,
  mockSbtcSponsorshipQuotes,
  mockSbtcSponsorshipSubmit,
} from '@tests/mocks/mock-sbtc';
import { mockZeroStxBalanceV2Request } from '@tests/mocks/mock-stacks-balances-v2';
import { MockedTokensSelectors } from '@tests/selectors/mocked-tokens.selectors';
import { SendCryptoAssetSelectors } from '@tests/selectors/send.selectors';
import { SharedComponentsSelectors } from '@tests/selectors/shared-component.selectors';
import BigNumber from 'bignumber.js';
import { z } from 'zod';

import { getSbtcSponsoredTransferDetails } from '@leather.io/stacks';

import { test } from '../../fixtures/fixtures';

const amount = '0.0001';
const sbtcDecimals = 8;
const fullSbtcBalance = '0.5';

const submitBodySchema = z.object({ quoteId: z.string(), transaction: z.string() });

function parseFeeLabelInSats(label: string) {
  return BigInt(new BigNumber(label.split(' ')[0]).shiftedBy(sbtcDecimals).toFixed(0));
}

function decodeSubmittedTransfer(body: unknown) {
  const { quoteId, transaction } = submitBodySchema.parse(body);
  const details = getSbtcSponsoredTransferDetails(deserializeTransaction(transaction));
  return { quoteId, fee: details?.fee, amount: details?.amount };
}

async function recordHiroBroadcasts(page: Page) {
  const broadcasts: string[] = [];
  await page.route('**/v2/transactions', route => {
    broadcasts.push(route.request().url());
    return route.fulfill({ status: 500 });
  });
  return broadcasts;
}

test.describe('Send sBTC with a sponsored sBTC fee', () => {
  test.beforeEach(async ({ extensionId, globalPage }) => {
    await globalPage.setupAndUseApiCalls(extensionId);
  });

  test('charges the fee in STX when the account has enough STX', async ({
    extensionId,
    homePage,
    onboardingPage,
    sendPage,
  }) => {
    await onboardingPage.signInWithTestAccount(extensionId);
    await homePage.sendButton.click();
    await sendPage.selectSip10AndGoToSendForm(MockedTokensSelectors.SbtcTokenTestId);

    await expect(sendPage.feeToBePaid).toContainText('STX');
    await expect(
      sendPage.page.getByTestId(SharedComponentsSelectors.SponsoredFeeBadge)
    ).toHaveCount(0);
  });

  test.describe('with no STX', () => {
    test.beforeEach(async ({ page }) => {
      await mockZeroStxBalanceV2Request(page);
    });

    test('offers sBTC fee tiers with the sponsored badge and no custom fee', async ({
      extensionId,
      homePage,
      onboardingPage,
      sendPage,
    }) => {
      await mockSbtcSponsorshipQuotes(sendPage.page, [createSbtcSponsorshipQuoteFixture()]);
      await onboardingPage.signInWithTestAccount(extensionId);
      await homePage.sendButton.click();
      await sendPage.selectSip10AndGoToSendForm(MockedTokensSelectors.SbtcTokenTestId);

      await expect(sendPage.feeToBePaid).toContainText('sBTC');
      await expect(
        sendPage.page.getByTestId(SharedComponentsSelectors.SponsoredFeeBadge)
      ).toBeVisible();

      await sendPage.page.getByTestId(SharedComponentsSelectors.MiddleFeeEstimateItem).click();
      await expect(
        sendPage.page.getByTestId(SharedComponentsSelectors.LowFeeEstimateItem)
      ).toBeVisible();
      await expect(
        sendPage.page.getByTestId(SharedComponentsSelectors.CustomFeeSelectItem)
      ).toHaveCount(0);
    });

    test('submits the quote id and the selected fee to the sponsor', async ({
      extensionId,
      homePage,
      onboardingPage,
      sendPage,
    }) => {
      const submissions: unknown[] = [];
      await mockSbtcSponsorshipQuotes(sendPage.page, [createSbtcSponsorshipQuoteFixture()]);
      await mockSbtcSponsorshipSubmit(sendPage.page, body => submissions.push(body));
      const hiroBroadcasts = await recordHiroBroadcasts(sendPage.page);

      await onboardingPage.signInWithTestAccount(extensionId);
      await homePage.sendButton.click();
      await sendPage.selectSip10AndGoToSendForm(MockedTokensSelectors.SbtcTokenTestId);

      await sendPage.page.getByTestId(SharedComponentsSelectors.MiddleFeeEstimateItem).click();
      await sendPage.page.getByTestId(SharedComponentsSelectors.LowFeeEstimateItem).click();
      await expect(sendPage.feeToBePaid).toContainText('sBTC');
      const lowFeeInSats = parseFeeLabelInSats(await sendPage.feeToBePaid.innerText());

      await sendPage.amountInput.fill(amount);
      await sendPage.recipientInput.fill(TEST_ACCOUNT_2_STX_ADDRESS);
      await sendPage.recipientInput.blur();
      await sendPage.previewSendTxButton.click();

      await expect(sendPage.confirmationDetails).toBeVisible();
      await expect(sendPage.feesRow).toContainText('sBTC');
      await expect(sendPage.confirmationDetails).toContainText('Total spend');

      await sendPage.confirmSendTransaction();

      await expect(sendPage.page.getByText('Sent', { exact: true })).toBeVisible();
      await expect(sendPage.page.getByText('Total spend')).toBeVisible();
      expect(submissions.map(decodeSubmittedTransfer)).toEqual([
        { quoteId: 'quote-1', fee: lowFeeInSats, amount: 10_000n },
      ]);
      expect(hiroBroadcasts).toEqual([]);
    });

    test('re-quotes an expired quote and submits on the second confirm', async ({
      extensionId,
      homePage,
      onboardingPage,
      sendPage,
    }) => {
      const submissions: unknown[] = [];
      await mockSbtcSponsorshipQuotes(sendPage.page, [
        createSbtcSponsorshipQuoteFixture({
          quoteId: 'quote-expired',
          expiresAt: new Date(Date.now() - 1000).toISOString(),
        }),
        createSbtcSponsorshipQuoteFixture({ quoteId: 'quote-2', satsPerStx: '500000' }),
      ]);
      await mockSbtcSponsorshipSubmit(sendPage.page, body => submissions.push(body));

      await onboardingPage.signInWithTestAccount(extensionId);
      await homePage.sendButton.click();
      await sendPage.selectSip10AndGoToSendForm(MockedTokensSelectors.SbtcTokenTestId);
      await expect(sendPage.feeToBePaid).toContainText('sBTC');

      await sendPage.amountInput.fill(amount);
      await sendPage.recipientInput.fill(TEST_ACCOUNT_2_STX_ADDRESS);
      await sendPage.recipientInput.blur();
      await sendPage.previewSendTxButton.click();
      await expect(sendPage.confirmationDetails).toBeVisible();

      await sendPage.confirmSendTransaction();
      const requoteCallout = sendPage.page.getByTestId(
        SendCryptoAssetSelectors.SbtcFeeRequoteCallout
      );
      await expect(requoteCallout).toContainText('Fee quote updated');
      expect(submissions).toEqual([]);

      await sendPage.confirmSendTransaction();

      await expect(sendPage.page.getByText('Sent', { exact: true })).toBeVisible();
      expect(submissions.map(decodeSubmittedTransfer)).toEqual([
        expect.objectContaining({ quoteId: 'quote-2' }),
      ]);
    });

    test('shows insufficient balance when the amount cannot cover the fee', async ({
      extensionId,
      homePage,
      onboardingPage,
      sendPage,
    }) => {
      await mockSbtcSponsorshipQuotes(sendPage.page, [createSbtcSponsorshipQuoteFixture()]);
      await onboardingPage.signInWithTestAccount(extensionId);
      await homePage.sendButton.click();
      await sendPage.selectSip10AndGoToSendForm(MockedTokensSelectors.SbtcTokenTestId);
      await expect(sendPage.feeToBePaid).toContainText('sBTC');

      await sendPage.amountInput.fill(fullSbtcBalance);
      await sendPage.recipientInput.fill(TEST_ACCOUNT_2_STX_ADDRESS);
      await sendPage.recipientInput.blur();
      await sendPage.previewSendTxButton.click();

      await expect(sendPage.amountInputErrorLabel).toContainText('Insufficient balance');
    });
  });
});
