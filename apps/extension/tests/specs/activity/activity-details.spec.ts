import { expect } from '@playwright/test';
import {
  mockLeatherBitcoinTransactions,
  mockLeatherTaprootOnlySendTx,
} from '@tests/mocks/mock-leather-btc-txs';
import { ActivitySelectors } from '@tests/selectors/activity.selectors';

import { minusSign } from '@leather.io/utils';

import { test } from '../../fixtures/fixtures';

const unknownTxid = 'f0e1d2c3b4a5f6e7d8c9b0a1f2e3d4c5b6a7f8e9d0c1b2a3f4e5d6c7b8a9f0e1';
const longListLength = 40;
const scrolledListOffset = 600;

const longActivityList = Array.from({ length: longListLength }, (_, index) => ({
  ...mockLeatherTaprootOnlySendTx,
  txid: index.toString(16).padStart(64, '0'),
  time: (mockLeatherTaprootOnlySendTx.time ?? 0) - index * 60,
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

    const activityList = page.getByTestId(ActivitySelectors.ActivityList);
    await activityList.getByText('BTC', { exact: true }).click();

    const details = page.getByTestId(ActivitySelectors.ActivityDetails);
    await expect(page.getByTestId(ActivitySelectors.ActivityDetailsTitle)).toHaveText(
      'Transaction'
    );
    await expect(details.getByText('Send BTC', { exact: true })).toBeVisible();
    await expect(details.getByText(`${minusSign} 0.00198`, { exact: true })).toBeVisible();
    await expect(page.getByTestId(ActivitySelectors.ActivityDetailsExplorerBtn)).toBeVisible();

    await page.getByTestId(ActivitySelectors.ActivityDetailsBack).click();
    await expect(activityList.getByText(`${minusSign} 0.00198`, { exact: true })).toBeVisible();
  });

  test('restores the list scroll position when coming back', async ({
    context,
    extensionId,
    onboardingPage,
    homePage,
    page,
  }) => {
    await mockLeatherBitcoinTransactions(context, longActivityList);
    await onboardingPage.signInWithTestAccount(extensionId);
    await homePage.clickActivityTab();

    const activityList = page.getByTestId(ActivitySelectors.ActivityList);
    await expect(activityList.getByText('BTC', { exact: true }).first()).toBeVisible();
    await page.evaluate(top => window.scrollTo({ top }), scrolledListOffset);
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(scrolledListOffset);

    const scrolledRow = activityList.getByText('BTC', { exact: true }).last();
    await scrolledRow.click();
    await expect(page.getByTestId(ActivitySelectors.ActivityDetailsTitle)).toBeVisible();

    await page.getByTestId(ActivitySelectors.ActivityDetailsBack).click();
    await expect(activityList).toBeVisible();
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(0);
  });

  test('shows not found for an unknown transaction', async ({
    context,
    extensionId,
    onboardingPage,
    page,
  }) => {
    await mockLeatherBitcoinTransactions(context, [mockLeatherTaprootOnlySendTx]);
    await onboardingPage.signInWithTestAccount(extensionId);
    await page.goto(
      `chrome-extension://${extensionId}/index.html#/activity/bitcoin/${unknownTxid}`
    );

    const details = page.getByTestId(ActivitySelectors.ActivityDetails);
    await expect(details.getByText('Transaction not found', { exact: true })).toBeVisible();
    await expect(page.getByTestId(ActivitySelectors.ActivityDetailsExplorerBtn)).toBeVisible();
  });

  test('shows not found without an explorer link for an unknown chain', async ({
    extensionId,
    onboardingPage,
    page,
  }) => {
    await onboardingPage.signInWithTestAccount(extensionId);
    await page.goto(
      `chrome-extension://${extensionId}/index.html#/activity/dogecoin/${unknownTxid}`
    );

    const details = page.getByTestId(ActivitySelectors.ActivityDetails);
    await expect(details.getByText('Transaction not found', { exact: true })).toBeVisible();
    await expect(page.getByTestId(ActivitySelectors.ActivityDetailsExplorerBtn)).toBeHidden();
  });
});
