import { expect } from '@playwright/test';
import {
  mockLeatherBitcoinTransactions,
  mockLeatherTaprootOnlySendTx,
} from '@tests/mocks/mock-leather-btc-txs';
import { ActivitySelectors } from '@tests/selectors/activity.selectors';

import { minusSign } from '@leather.io/utils';

import { test } from '../../fixtures/fixtures';

const unknownTxid = 'f'.repeat(64);
const secondsPerDay = 86_400;
const scrolledListOffset = 1500;
const latestSendTime = 1_696_400_000;

const manyTaprootSends = Array.from({ length: 40 }, (_, index) => ({
  ...mockLeatherTaprootOnlySendTx,
  txid: index.toString(16).padStart(64, '0'),
  time: latestSendTime - index * secondsPerDay,
}));

test.describe('Activity details', () => {
  test.beforeEach(async ({ extensionId, globalPage }) => {
    await globalPage.setupAndUseApiCalls(extensionId);
  });

  test('opens a taproot send from the list and goes back to it', async ({
    context,
    extensionId,
    onboardingPage,
    homePage,
    page,
  }) => {
    await mockLeatherBitcoinTransactions(context, [mockLeatherTaprootOnlySendTx]);
    await onboardingPage.signInWithTestAccount(extensionId);
    await homePage.clickActivityTab();
    await homePage.openActivityDetails('BTC');

    const details = page.getByTestId(ActivitySelectors.ActivityDetails);
    await expect(page.getByTestId(ActivitySelectors.ActivityDetailsTitle)).toHaveText(
      'Transaction'
    );
    await expect(details.getByText('Send BTC', { exact: true })).toBeVisible();
    await expect(
      page
        .getByTestId(ActivitySelectors.ActivityDetailsBalanceChanges)
        .getByText(`${minusSign} 0.00198`, { exact: true })
    ).toBeVisible();
    await expect(page.getByTestId(ActivitySelectors.ActivityDetailsExplorerBtn)).toBeVisible();

    await page.getByTestId(ActivitySelectors.ActivityDetailsBackBtn).click();
    await expect(page.getByTestId(ActivitySelectors.ActivityList)).toBeVisible();
    await expect(page.getByTestId(ActivitySelectors.ActivityDetails)).toBeHidden();
  });

  test('restores the list scroll position when coming back', async ({
    context,
    extensionId,
    onboardingPage,
    homePage,
    page,
  }) => {
    await mockLeatherBitcoinTransactions(context, manyTaprootSends);
    await onboardingPage.signInWithTestAccount(extensionId);
    await homePage.clickActivityTab();

    const activityList = page.getByTestId(ActivitySelectors.ActivityList);
    await expect(activityList.getByText('BTC', { exact: true }).first()).toBeVisible();
    await page.mouse.wheel(0, scrolledListOffset);
    await expect
      .poll(() => page.evaluate(() => window.scrollY))
      .toBeGreaterThan(scrolledListOffset / 2);

    await activityList.getByText('BTC', { exact: true }).nth(8).click();
    await expect(page.getByTestId(ActivitySelectors.ActivityDetailsTitle)).toBeVisible();
    await page.getByTestId(ActivitySelectors.ActivityDetailsBackBtn).click();

    await expect(activityList).toBeVisible();
    await expect
      .poll(() => page.evaluate(() => window.scrollY))
      .toBeGreaterThan(scrolledListOffset / 2);
  });

  test('resolves a deep-linked bitcoin txid from the account transactions', async ({
    context,
    extensionId,
    onboardingPage,
    page,
  }) => {
    await mockLeatherBitcoinTransactions(context, [mockLeatherTaprootOnlySendTx]);
    await onboardingPage.signInWithTestAccount(extensionId);
    await page.goto(
      `chrome-extension://${extensionId}/index.html#/activity/bitcoin/${mockLeatherTaprootOnlySendTx.txid}`
    );

    const details = page.getByTestId(ActivitySelectors.ActivityDetails);
    await expect(details.getByText('Send BTC', { exact: true })).toBeVisible();

    await page.getByTestId(ActivitySelectors.ActivityDetailsBackBtn).click();
    await expect(page.getByTestId(ActivitySelectors.ActivityList)).toBeVisible();
  });

  test('shows not found with the explorer button for an unknown txid', async ({
    context,
    extensionId,
    onboardingPage,
    page,
  }) => {
    await mockLeatherBitcoinTransactions(context, []);
    await onboardingPage.signInWithTestAccount(extensionId);
    await page.goto(
      `chrome-extension://${extensionId}/index.html#/activity/bitcoin/${unknownTxid}`
    );

    const notFound = page.getByTestId(ActivitySelectors.ActivityDetailsNotFound);
    await expect(notFound.getByText('Transaction not found', { exact: true })).toBeVisible();
    await expect(page.getByTestId(ActivitySelectors.ActivityDetailsExplorerBtn)).toBeVisible();
  });

  test('shows not found without the explorer button for an unknown chain', async ({
    extensionId,
    onboardingPage,
    page,
  }) => {
    await onboardingPage.signInWithTestAccount(extensionId);
    await page.goto(
      `chrome-extension://${extensionId}/index.html#/activity/dogecoin/${unknownTxid}`
    );

    const notFound = page.getByTestId(ActivitySelectors.ActivityDetailsNotFound);
    await expect(notFound.getByText('Transaction not found', { exact: true })).toBeVisible();
    await expect(page.getByTestId(ActivitySelectors.ActivityDetailsExplorerBtn)).toBeHidden();
  });
});
