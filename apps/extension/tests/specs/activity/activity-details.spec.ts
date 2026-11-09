import { expect } from '@playwright/test';
import {
  mockLeatherBitcoinTransactions,
  mockLeatherTaprootOnlySendTx,
} from '@tests/mocks/mock-leather-btc-txs';
import { ActivitySelectors } from '@tests/selectors/activity.selectors';

import { minusSign } from '@leather.io/utils';

import { test } from '../../fixtures/fixtures';

const unknownTxid = 'f'.repeat(64);
const scrollFeedLength = 30;
const satsPerStep = 100_000;
const secondsPerDay = 86_400;

function createScrollFeed() {
  return Array.from({ length: scrollFeedLength }, (_, index) => ({
    ...mockLeatherTaprootOnlySendTx,
    txid: index.toString(16).padStart(64, '0'),
    time: (mockLeatherTaprootOnlySendTx.time ?? 0) - index * secondsPerDay,
    vout: [{ ...mockLeatherTaprootOnlySendTx.vout[0], value: String((index + 1) * satsPerStep) }],
  }));
}

const scrollStepPx = 400;

function readScrollY() {
  return window.scrollY;
}

function scrollWindowBy(top: number) {
  window.scrollBy({ top });
}

test.describe('Activity details', () => {
  test.beforeEach(async ({ extensionId, globalPage }) => {
    await globalPage.setupAndUseApiCalls(extensionId);
  });

  test('opens a taproot send and returns to the list', async ({
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
    await expect(details.getByText('Send BTC', { exact: true })).toBeVisible();
    await expect(details.getByText(`${minusSign} 0.00198`)).toBeVisible();
    await expect(details.getByText('Balance changes', { exact: true })).toBeVisible();
    await expect(details.getByText('Transaction details', { exact: true })).toBeVisible();
    await expect(page.getByTestId(ActivitySelectors.ActivityDetailsExplorerButton)).toBeVisible();

    await page.getByTestId(ActivitySelectors.ActivityDetailsBackButton).click();
    const activityList = page.getByTestId(ActivitySelectors.ActivityList);
    await expect(activityList.getByText(`${minusSign} 0.00198`, { exact: true })).toBeVisible();
  });

  test('shows not found for an unknown transaction', async ({
    context,
    extensionId,
    onboardingPage,
    homePage,
    page,
  }) => {
    await mockLeatherBitcoinTransactions(context, [mockLeatherTaprootOnlySendTx]);
    await onboardingPage.signInWithTestAccount(extensionId);
    await homePage.clickActivityTab();
    await page.evaluate(txid => {
      window.location.hash = `#/activity/bitcoin/${txid}`;
    }, unknownTxid);

    const details = page.getByTestId(ActivitySelectors.ActivityDetails);
    await expect(details.getByText('Transaction not found', { exact: true })).toBeVisible();
    await expect(page.getByTestId(ActivitySelectors.ActivityDetailsExplorerButton)).toBeVisible();
  });

  test('shows not found without an explorer link for an unknown chain', async ({
    context,
    extensionId,
    onboardingPage,
    homePage,
    page,
  }) => {
    await mockLeatherBitcoinTransactions(context, []);
    await onboardingPage.signInWithTestAccount(extensionId);
    await homePage.clickActivityTab();
    await page.evaluate(txid => {
      window.location.hash = `#/activity/dogecoin/${txid}`;
    }, unknownTxid);

    const details = page.getByTestId(ActivitySelectors.ActivityDetails);
    await expect(details.getByText('Transaction not found', { exact: true })).toBeVisible();
    await expect(page.getByTestId(ActivitySelectors.ActivityDetailsExplorerButton)).toBeHidden();
  });

  test('restores the list scroll position on return', async ({
    context,
    extensionId,
    onboardingPage,
    homePage,
    page,
  }) => {
    await mockLeatherBitcoinTransactions(context, createScrollFeed());
    await onboardingPage.signInWithTestAccount(extensionId);
    await homePage.clickActivityTab();

    const targetAmount = `${minusSign} 0.015`;
    const activityList = page.getByTestId(ActivitySelectors.ActivityList);
    const targetRow = activityList.getByText(targetAmount, { exact: true });
    await expect(async () => {
      await page.evaluate(scrollWindowBy, scrollStepPx);
      await expect(targetRow).toBeInViewport({ timeout: 500 });
    }).toPass();
    const scrollY = await page.evaluate(readScrollY);
    expect(scrollY).toBeGreaterThan(0);

    await homePage.openActivityDetails(targetAmount);
    await page.getByTestId(ActivitySelectors.ActivityDetailsBackButton).click();

    await expect(targetRow).toBeInViewport();
    await expect.poll(() => page.evaluate(readScrollY)).toBe(scrollY);
  });
});
