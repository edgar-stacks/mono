import { deserializeTransaction } from '@stacks/transactions';
import { TEST_ACCOUNT_2_STX_ADDRESS } from '@tests/mocks/constants';
import {
  SBTC_SPONSOR_FEE_RECIPIENT,
  createSbtcSponsorshipQuoteFixture,
  mockSbtcSponsorshipQuotes,
  mockSbtcSponsorshipSubmit,
} from '@tests/mocks/mock-sbtc';
import { mockStxBalanceV2Request } from '@tests/mocks/mock-stacks-balances-v2';
import { mockStacksBroadcastTransaction } from '@tests/mocks/mock-stacks-txs';
import { MockedTokensSelectors } from '@tests/selectors/mocked-tokens.selectors';
import { SendCryptoAssetSelectors } from '@tests/selectors/send.selectors';
import { SharedComponentsSelectors } from '@tests/selectors/shared-component.selectors';

import { getSbtcSponsoredTransferDetails } from '@leather.io/stacks';

import { test } from '../../fixtures/fixtures';

const leatherTestTokenTestId =
  'SP000000000000000000002Q6VF78.leather-integration-tests::leather-test-token';
const sbtcBalance = '0.5';
const amount = '0.001';
const memo = 'sponsored';

test.describe('Send sBTC with a sponsored fee', () => {
  test.beforeEach(async ({ extensionId, globalPage }) => {
    await globalPage.setupAndUseApiCalls(extensionId);
  });

  test('charges STX fee tiers when the account holds enough STX', async ({
    extensionId,
    globalPage,
    homePage,
    onboardingPage,
    sendPage,
  }) => {
    await onboardingPage.signInWithTestAccount(extensionId);
    await mockSbtcSponsorshipQuotes(globalPage.page.context());
    await homePage.sendButton.click();
    await sendPage.selectSip10AndGoToSendForm(MockedTokensSelectors.SbtcTokenTestId);

    await test.expect(sendPage.feeToBePaid).toContainText('STX');
    await test
      .expect(sendPage.page.getByTestId(SharedComponentsSelectors.SponsoredFeeBadge))
      .toBeHidden();
  });

  test.describe('without STX', () => {
    test.beforeEach(async ({ extensionId, globalPage, onboardingPage }) => {
      await mockStxBalanceV2Request(globalPage.page.context(), '0');
      await onboardingPage.signInWithTestAccount(extensionId);
    });

    test('offers sponsored sBTC fee tiers without a custom fee', async ({
      globalPage,
      homePage,
      sendPage,
    }) => {
      await mockSbtcSponsorshipQuotes(globalPage.page.context());
      await homePage.sendButton.click();
      await sendPage.selectSip10AndGoToSendForm(MockedTokensSelectors.SbtcTokenTestId);

      await test.expect(sendPage.feeToBePaid).toContainText('sBTC');
      await test
        .expect(sendPage.page.getByTestId(SharedComponentsSelectors.SponsoredFeeBadge))
        .toBeVisible();

      await sendPage.page.getByTestId(SharedComponentsSelectors.MiddleFeeEstimateItem).click();
      const feeSelect = sendPage.page.getByTestId(SharedComponentsSelectors.FeeEstimateSelect);
      await test
        .expect(feeSelect.getByTestId(SharedComponentsSelectors.LowFeeEstimateItem))
        .toBeVisible();
      await test
        .expect(feeSelect.getByTestId(SharedComponentsSelectors.HighFeeEstimateItem))
        .toBeVisible();
      await test
        .expect(feeSelect.getByTestId(SharedComponentsSelectors.CustomFeeSelectItem))
        .toBeHidden();
    });

    test('submits the selected sBTC fee and quote id to the sponsor', async ({
      globalPage,
      homePage,
      sendPage,
    }) => {
      const context = globalPage.page.context();
      const quote = createSbtcSponsorshipQuoteFixture();
      await mockSbtcSponsorshipQuotes(context, quote);
      const txid = await mockStacksBroadcastTransaction(context);
      const submitRequests = await mockSbtcSponsorshipSubmit(context, { txid });

      await homePage.sendButton.click();
      await sendPage.selectSip10AndGoToSendForm(MockedTokensSelectors.SbtcTokenTestId);
      await test.expect(sendPage.feeToBePaid).toContainText('sBTC');

      await sendPage.page.getByTestId(SharedComponentsSelectors.MiddleFeeEstimateItem).click();
      await sendPage.page
        .getByTestId(SharedComponentsSelectors.FeeEstimateSelect)
        .getByTestId(SharedComponentsSelectors.HighFeeEstimateItem)
        .click();
      const highFee = (await sendPage.feeToBePaid.innerText()).replace('sBTC', '').trim();

      await sendPage.amountInput.fill(amount);
      await sendPage.recipientInput.fill(TEST_ACCOUNT_2_STX_ADDRESS);
      await sendPage.recipientInput.blur();
      await sendPage.memoInput.fill(memo);
      await sendPage.memoInput.blur();
      await sendPage.previewSendTxButton.click();

      await test.expect(sendPage.confirmationDetails).toBeVisible();
      await test
        .expect(
          sendPage.confirmationDetails.getByTestId(SharedComponentsSelectors.SponsoredFeeBadge)
        )
        .toBeVisible();
      await test.expect(sendPage.feesRow).toContainText(highFee);

      await sendPage.confirmSendTransaction();
      await test.expect(sendPage.page.getByText('Sent')).toBeVisible();
      const sentSummary = sendPage.page.getByTestId(
        SendCryptoAssetSelectors.SentTransactionSummary
      );
      for (const label of ['Total spend', 'Sending', 'Fee', 'Memo', 'Nonce', memo]) {
        await test.expect(sentSummary).toContainText(label);
      }

      test.expect(submitRequests).toHaveLength(1);
      test.expect(submitRequests[0].quoteId).toBe(quote.quoteId);
      const details = getSbtcSponsoredTransferDetails(
        deserializeTransaction(submitRequests[0].transaction)
      );
      test.expect(details?.recipient).toBe(TEST_ACCOUNT_2_STX_ADDRESS);
      test.expect(details?.feeRecipient).toBe(SBTC_SPONSOR_FEE_RECIPIENT);
      test.expect(details?.memo).toBe(memo);
      test.expect(details?.amount).toBe(100_000n);
      test.expect(details?.fee.toString()).toBe(String(Math.round(Number(highFee) * 1e8)));
    });

    test('refreshes an expired quote before confirming again', async ({
      globalPage,
      homePage,
      sendPage,
    }) => {
      const context = globalPage.page.context();
      const quotes = await mockSbtcSponsorshipQuotes(context);
      const txid = await mockStacksBroadcastTransaction(context);
      const submitRequests = await mockSbtcSponsorshipSubmit(context, {
        txid,
        errors: [{ status: 409, error: 'Quote expired', code: 'quote_expired' }],
      });

      await homePage.sendButton.click();
      await sendPage.selectSip10AndGoToSendForm(MockedTokensSelectors.SbtcTokenTestId);
      await test.expect(sendPage.feeToBePaid).toContainText('sBTC');

      await sendPage.amountInput.fill(amount);
      await sendPage.recipientInput.fill(TEST_ACCOUNT_2_STX_ADDRESS);
      await sendPage.recipientInput.blur();
      await sendPage.previewSendTxButton.click();
      await test.expect(sendPage.confirmationDetails).toBeVisible();

      quotes.use(
        createSbtcSponsorshipQuoteFixture({
          quoteId: 'sbtc-sponsorship-quote-2',
          minFeeSats: 30_000,
        })
      );
      await sendPage.confirmSendTransaction();

      await test.expect(sendPage.page.getByText('Fee quote updated')).toBeVisible();
      await test.expect(sendPage.feesRow).toContainText('0.0003');
      await test.expect(sendPage.confirmationDetails).toContainText('0.0013');

      await sendPage.confirmSendTransaction();
      await test.expect(sendPage.page.getByText('Sent')).toBeVisible();

      test
        .expect(submitRequests.map(request => request.quoteId))
        .toEqual(['sbtc-sponsorship-quote-1', 'sbtc-sponsorship-quote-2']);
    });

    test('rejects an amount that cannot also cover the sBTC fee', async ({
      globalPage,
      homePage,
      sendPage,
    }) => {
      await mockSbtcSponsorshipQuotes(globalPage.page.context());
      await homePage.sendButton.click();
      await sendPage.selectSip10AndGoToSendForm(MockedTokensSelectors.SbtcTokenTestId);
      await test.expect(sendPage.feeToBePaid).toContainText('sBTC');

      await sendPage.amountInput.fill(sbtcBalance);
      await sendPage.recipientInput.fill(TEST_ACCOUNT_2_STX_ADDRESS);
      await sendPage.recipientInput.blur();
      await sendPage.previewSendTxButton.click();

      await test.expect(sendPage.amountInputErrorLabel).toContainText('Insufficient balance');
    });

    test('still charges STX for other tokens', async ({ globalPage, homePage, sendPage }) => {
      await mockSbtcSponsorshipQuotes(globalPage.page.context());
      await homePage.sendButton.click();
      await sendPage.selectSip10AndGoToSendForm(leatherTestTokenTestId);

      await test.expect(sendPage.feeToBePaid).toContainText('STX');
      await test
        .expect(sendPage.page.getByTestId(SharedComponentsSelectors.SponsoredFeeBadge))
        .toBeHidden();
    });
  });
});
