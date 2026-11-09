import type { Page, Request } from '@playwright/test';
import { deserializeTransaction } from '@stacks/transactions';
import { TEST_ACCOUNT_2_STX_ADDRESS } from '@tests/mocks/constants';
import {
  SBTC_SPONSORSHIP_FEE_RECIPIENT,
  createSbtcSponsorshipQuoteFixture,
  mockSbtcSponsorshipQuote,
  mockSbtcSponsorshipSubmit,
} from '@tests/mocks/mock-sbtc';
import { mockZeroStxBalanceV2Request } from '@tests/mocks/mock-stacks-balances-v2';
import type { SendPage } from '@tests/page-object-models/send.page';
import { MockedTokensSelectors } from '@tests/selectors/mocked-tokens.selectors';
import { SendCryptoAssetSelectors } from '@tests/selectors/send.selectors';
import { SharedComponentsSelectors } from '@tests/selectors/shared-component.selectors';
import BigNumber from 'bignumber.js';
import { z } from 'zod';

import { getSbtcSponsoredTransferDetails } from '@leather.io/stacks';
import { assertExistence } from '@leather.io/utils';

import { test } from '../../fixtures/fixtures';

const amount = '0.0001';
const sbtcDecimals = 8;
const sponsorshipSubmitUrl = '**/v1/sponsorship/submit';
const hiroBroadcastUrlPattern = /hiro\.so\/v2\/transactions/;

const submitBodySchema = z.object({ quoteId: z.string(), transaction: z.string() });

function decodeSubmittedTransfer(request: Request) {
  const body = submitBodySchema.parse(request.postDataJSON());
  const details = getSbtcSponsoredTransferDetails(deserializeTransaction(body.transaction));
  assertExistence(details, 'Submitted transaction is not a sponsored sBTC transfer');
  return { quoteId: body.quoteId, details };
}

function feeLabelToSats(label: string | null) {
  assertExistence(label, 'The fee label has no text');
  const fee = /([\d.]+)\s*sBTC/.exec(label)?.[1];
  assertExistence(fee, 'The fee label has no sBTC amount');
  return new BigNumber(fee).shiftedBy(sbtcDecimals).toString(10);
}

async function fillTransfer(sendPage: SendPage) {
  await sendPage.amountInput.fill(amount);
  await sendPage.amountInput.blur();
  await sendPage.recipientInput.fill(TEST_ACCOUNT_2_STX_ADDRESS);
  await sendPage.recipientInput.blur();
}

function trackHiroBroadcasts(page: Page) {
  const broadcasts: string[] = [];
  page.on('request', request => {
    if (hiroBroadcastUrlPattern.test(request.url())) broadcasts.push(request.url());
  });
  return broadcasts;
}

test.describe('send sBTC with a sponsored fee', () => {
  test.describe('with enough STX for the fee', () => {
    test.beforeEach(async ({ extensionId, globalPage, homePage, onboardingPage, sendPage }) => {
      await globalPage.setupAndUseApiCalls(extensionId);
      await onboardingPage.signInWithTestAccount(extensionId);
      await homePage.sendButton.click();
      await sendPage.selectSip10AndGoToSendForm(MockedTokensSelectors.SbtcTokenTestId);
    });

    test('shows the STX fee tiers without the sponsored badge', async ({ sendPage }) => {
      await test.expect(sendPage.feeToBePaid).toContainText('STX');
      await test
        .expect(sendPage.page.getByTestId(SendCryptoAssetSelectors.SponsoredFeeBadge))
        .toHaveCount(0);
    });
  });

  test.describe('with no STX', () => {
    test.beforeEach(async ({ extensionId, globalPage, onboardingPage, page }) => {
      await globalPage.setupAndUseApiCalls(extensionId);
      await mockZeroStxBalanceV2Request(page);
      await onboardingPage.signInWithTestAccount(extensionId);
    });

    test.describe('with a valid quote', () => {
      test.beforeEach(async ({ homePage, sendPage }) => {
        await homePage.sendButton.click();
        await sendPage.selectSip10AndGoToSendForm(MockedTokensSelectors.SbtcTokenTestId);
      });

      test('shows the sBTC fee tiers with the badge and no custom fee', async ({
        sendPage,
        page,
      }) => {
        await test
          .expect(page.getByTestId(SendCryptoAssetSelectors.SponsoredFeeBadge))
          .toBeVisible();
        await test.expect(sendPage.feeToBePaid).toContainText('sBTC');

        await page.getByTestId(SharedComponentsSelectors.MiddleFeeEstimateItem).click();
        await test
          .expect(page.getByTestId(SharedComponentsSelectors.HighFeeEstimateItem))
          .toBeVisible();
        await test
          .expect(page.getByTestId(SharedComponentsSelectors.CustomFeeSelectItem))
          .toHaveCount(0);
      });

      test('submits the quote with the selected fee and never broadcasts to Hiro', async ({
        sendPage,
        page,
      }) => {
        const hiroBroadcasts = trackHiroBroadcasts(page);

        await fillTransfer(sendPage);
        await page.getByTestId(SharedComponentsSelectors.MiddleFeeEstimateItem).click();
        await page.getByTestId(SharedComponentsSelectors.HighFeeEstimateItem).click();
        await test.expect(sendPage.feeToBePaid).toContainText('sBTC');
        const expectedFeeSats = feeLabelToSats(await sendPage.feeToBePaid.textContent());

        await sendPage.previewSendTxButton.click();
        await test.expect(sendPage.confirmationDetails).toBeVisible();
        await test.expect(sendPage.feesRow).toContainText('sBTC');
        await test.expect(page.getByText('Total spend')).toBeVisible();

        const [submitRequest] = await Promise.all([
          page.waitForRequest(sponsorshipSubmitUrl),
          sendPage.confirmSendTransaction(),
        ]);
        const { quoteId, details } = decodeSubmittedTransfer(submitRequest);

        test.expect(quoteId).toEqual('quote-1');
        test.expect(details.fee.toString()).toEqual(expectedFeeSats);
        test.expect(details.feeRecipient).toEqual(SBTC_SPONSORSHIP_FEE_RECIPIENT);
        test.expect(details.recipient).toEqual(TEST_ACCOUNT_2_STX_ADDRESS);
        test
          .expect(details.amount.toString())
          .toEqual(new BigNumber(amount).shiftedBy(sbtcDecimals).toString(10));

        await test.expect(page.getByText('Total spend')).toBeVisible();
        await test.expect(page.getByText('Sent', { exact: true })).toBeVisible();
        test.expect(hiroBroadcasts).toEqual([]);
      });

      test('re-quotes when the sponsor reports an expired quote', async ({ sendPage, page }) => {
        await mockSbtcSponsorshipSubmit(page, { errorCodes: ['quote_expired'] });
        await fillTransfer(sendPage);
        await sendPage.previewSendTxButton.click();
        await test.expect(sendPage.confirmationDetails).toBeVisible();

        await sendPage.confirmSendTransaction();
        await test
          .expect(page.getByTestId(SendCryptoAssetSelectors.SbtcFeeRequoteCallout))
          .toBeVisible();
        await sendPage.confirmSendTransaction();

        await test.expect(page.getByText('Sent', { exact: true })).toBeVisible();
      });

      test('shows insufficient balance when the amount cannot cover the fee', async ({
        sendPage,
      }) => {
        await sendPage.amountInput.fill('0.5');
        await sendPage.amountInput.blur();

        await test.expect(sendPage.amountInputErrorLabel).toContainText('Insufficient balance');
      });
    });

    test.describe('with an expired quote', () => {
      test.beforeEach(async ({ homePage, sendPage, page }) => {
        await mockSbtcSponsorshipQuote(
          page,
          createSbtcSponsorshipQuoteFixture({
            quoteId: 'expired-quote',
            expiresAt: new Date(Date.now() - 1000).toISOString(),
          })
        );
        await homePage.sendButton.click();
        await sendPage.selectSip10AndGoToSendForm(MockedTokensSelectors.SbtcTokenTestId);
      });

      test('re-quotes before submitting', async ({ sendPage, page }) => {
        await fillTransfer(sendPage);
        await sendPage.previewSendTxButton.click();
        await test.expect(sendPage.confirmationDetails).toBeVisible();

        await mockSbtcSponsorshipQuote(
          page,
          createSbtcSponsorshipQuoteFixture({ quoteId: 'fresh-quote' })
        );
        await sendPage.confirmSendTransaction();
        await test
          .expect(page.getByTestId(SendCryptoAssetSelectors.SbtcFeeRequoteCallout))
          .toBeVisible();

        const [submitRequest] = await Promise.all([
          page.waitForRequest(sponsorshipSubmitUrl),
          sendPage.confirmSendTransaction(),
        ]);

        test.expect(decodeSubmittedTransfer(submitRequest).quoteId).toEqual('fresh-quote');
        await test.expect(page.getByText('Sent', { exact: true })).toBeVisible();
      });
    });
  });
});
