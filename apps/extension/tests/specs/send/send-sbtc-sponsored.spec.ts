import { type BrowserContext, type Page, expect } from '@playwright/test';
import { deserializeTransaction } from '@stacks/transactions';
import { TEST_ACCOUNT_2_STX_ADDRESS } from '@tests/mocks/constants';
import {
  createSbtcSponsorshipQuoteFixture,
  mockSbtcSponsorshipQuotes,
  mockSbtcSponsorshipSubmit,
} from '@tests/mocks/mock-sbtc';
import { mockStxBalanceV2Request } from '@tests/mocks/mock-stacks-balances-v2';
import { mockStacksBroadcastTransaction } from '@tests/mocks/mock-stacks-txs';
import { MockedTokensSelectors } from '@tests/selectors/mocked-tokens.selectors';
import { SharedComponentsSelectors } from '@tests/selectors/shared-component.selectors';
import { z } from 'zod';

import { getSbtcSponsoredTransferDetails } from '@leather.io/stacks';
import { assertExistence } from '@leather.io/utils';

import { test } from '../../fixtures/fixtures';

const amount = '0.0001';
const amountSats = 10_000n;
const leatherTestTokenTestId =
  'SP000000000000000000002Q6VF78.leather-integration-tests::leather-test-token';

const submittedBodySchema = z.object({ quoteId: z.string(), transaction: z.string() });

const firstQuote = createSbtcSponsorshipQuoteFixture({
  quoteId: 'sbtc-quote-1',
  satsPerStx: '1000000',
});
const refreshedQuote = createSbtcSponsorshipQuoteFixture({
  quoteId: 'sbtc-quote-2',
  satsPerStx: '2000000',
});

function readSubmittedTransfer(body: unknown) {
  const { quoteId, transaction } = submittedBodySchema.parse(body);
  const details = getSbtcSponsoredTransferDetails(deserializeTransaction(transaction));
  assertExistence(details, 'Submitted transaction is not a sponsored sBTC transfer');
  return { quoteId, details };
}

function feeLabelToSats(label: string) {
  const [value] = label.trim().split(' ');
  return BigInt(Math.round(Number(value) * 1e8));
}

async function mockAccountWithoutStx(page: Page | BrowserContext) {
  await mockStxBalanceV2Request(page, '0');
}

test.describe('Send sBTC with a sponsored fee', () => {
  test.beforeEach(async ({ extensionId, globalPage }) => {
    await globalPage.setupAndUseApiCalls(extensionId);
    await mockStacksBroadcastTransaction(globalPage.page);
  });

  test('shows STX fee tiers when the account holds enough STX', async ({
    extensionId,
    homePage,
    onboardingPage,
    sendPage,
  }) => {
    await onboardingPage.signInWithTestAccount(extensionId);
    await homePage.sendButton.click();
    await sendPage.selectSip10AndGoToSendForm(MockedTokensSelectors.SbtcTokenTestId);

    await expect(sendPage.feeToBePaid).toContainText('STX');
    await expect(sendPage.page.getByText('Sponsored', { exact: true })).toBeHidden();
  });

  test('shows sponsored sBTC fee tiers when the account has no STX', async ({
    extensionId,
    globalPage,
    homePage,
    onboardingPage,
    sendPage,
  }) => {
    await mockAccountWithoutStx(globalPage.page);
    await mockSbtcSponsorshipQuotes(globalPage.page, [firstQuote]);
    await onboardingPage.signInWithTestAccount(extensionId);
    await homePage.sendButton.click();
    await sendPage.selectSip10AndGoToSendForm(MockedTokensSelectors.SbtcTokenTestId);

    await expect(sendPage.feeToBePaid).toContainText('sBTC');
    await expect(sendPage.page.getByText('Sponsored', { exact: true })).toBeVisible();
    await sendPage.page.getByTestId('standard-fee').click();
    await expect(
      sendPage.page.getByTestId(SharedComponentsSelectors.FeeEstimateSelect)
    ).toBeVisible();
    await expect(sendPage.page.getByTestId('custom-fee')).toBeHidden();
  });

  test('submits the selected sBTC fee and quote id to the sponsor', async ({
    extensionId,
    globalPage,
    homePage,
    onboardingPage,
    sendPage,
  }) => {
    await mockAccountWithoutStx(globalPage.page);
    await mockSbtcSponsorshipQuotes(globalPage.page, [firstQuote]);
    const submitted = await mockSbtcSponsorshipSubmit(globalPage.page);
    await onboardingPage.signInWithTestAccount(extensionId);
    await homePage.sendButton.click();
    await sendPage.selectSip10AndGoToSendForm(MockedTokensSelectors.SbtcTokenTestId);

    await sendPage.page.getByTestId('standard-fee').click();
    await sendPage.page.getByTestId('high-fee').click();
    await expect(sendPage.page.getByTestId('high-fee')).toBeVisible();
    const highFeeSats = feeLabelToSats(await sendPage.feeToBePaid.innerText());

    await sendPage.amountInput.fill(amount);
    await sendPage.recipientInput.fill(TEST_ACCOUNT_2_STX_ADDRESS);
    await sendPage.recipientInput.blur();
    await sendPage.previewSendTxButton.click();

    await expect(sendPage.confirmationDetails).toBeVisible();
    await expect(
      sendPage.confirmationDetails.getByText('Sponsored', { exact: true })
    ).toBeVisible();
    await sendPage.confirmSendTransaction();

    await expect(sendPage.page.getByText('Sent')).toBeVisible();
    await expect.poll(() => submitted.length).toBe(1);
    const { quoteId, details } = readSubmittedTransfer(submitted[0]);
    expect(quoteId).toBe(firstQuote.quoteId);
    expect(details.amount).toBe(amountSats);
    expect(details.recipient).toBe(TEST_ACCOUNT_2_STX_ADDRESS);
    expect(details.feeRecipient).toBe(firstQuote.feeRecipientPrincipal);
    expect(details.fee).toBe(highFeeSats);
  });

  test('refreshes an expired quote before confirming again', async ({
    extensionId,
    globalPage,
    homePage,
    onboardingPage,
    sendPage,
  }) => {
    await mockAccountWithoutStx(globalPage.page);
    await mockSbtcSponsorshipQuotes(globalPage.page, [firstQuote, refreshedQuote]);
    const submitted = await mockSbtcSponsorshipSubmit(globalPage.page, [
      { status: 409, json: { error: 'Quote expired', code: 'quote_expired' } },
    ]);
    await onboardingPage.signInWithTestAccount(extensionId);
    await homePage.sendButton.click();
    await sendPage.selectSip10AndGoToSendForm(MockedTokensSelectors.SbtcTokenTestId);

    await sendPage.amountInput.fill(amount);
    await sendPage.recipientInput.fill(TEST_ACCOUNT_2_STX_ADDRESS);
    await sendPage.recipientInput.blur();
    await sendPage.previewSendTxButton.click();

    const totalSpend = sendPage.confirmationDetails
      .getByTestId(SharedComponentsSelectors.InfoCardRowValue)
      .first();
    await expect(totalSpend).toContainText('sBTC');
    const initialTotal = await totalSpend.innerText();
    await sendPage.confirmSendTransaction();

    await expect(sendPage.page.getByText('Fee quote updated')).toBeVisible();
    await expect(totalSpend).not.toHaveText(initialTotal);
    await sendPage.confirmSendTransaction();

    await expect(sendPage.page.getByText('Sent')).toBeVisible();
    await expect.poll(() => submitted.length).toBe(2);
    expect(readSubmittedTransfer(submitted[1]).quoteId).toBe(refreshedQuote.quoteId);
  });

  test('rejects an amount that cannot also cover the sBTC fee', async ({
    extensionId,
    globalPage,
    homePage,
    onboardingPage,
    sendPage,
  }) => {
    await mockAccountWithoutStx(globalPage.page);
    await mockSbtcSponsorshipQuotes(globalPage.page, [firstQuote]);
    await onboardingPage.signInWithTestAccount(extensionId);
    await homePage.sendButton.click();
    await sendPage.selectSip10AndGoToSendForm(MockedTokensSelectors.SbtcTokenTestId);

    await sendPage.amountInput.fill('0.5');
    await sendPage.recipientInput.fill(TEST_ACCOUNT_2_STX_ADDRESS);
    await sendPage.recipientInput.blur();
    await sendPage.previewSendTxButton.click();

    await expect(sendPage.amountInputErrorLabel).toContainText('Insufficient balance');
  });

  test('still charges STX for another token', async ({
    extensionId,
    globalPage,
    homePage,
    onboardingPage,
    sendPage,
  }) => {
    await mockAccountWithoutStx(globalPage.page);
    await onboardingPage.signInWithTestAccount(extensionId);
    await homePage.sendButton.click();
    await sendPage.selectSip10AndGoToSendForm(leatherTestTokenTestId);

    await expect(sendPage.feeToBePaid).toContainText('STX');
    await expect(sendPage.page.getByText('Sponsored', { exact: true })).toBeHidden();
  });
});
