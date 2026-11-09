import type { BrowserContext, Page } from '@playwright/test';
import {
  ClarityVersion,
  bufferCVFromString,
  getAddressFromPublicKey,
  noneCV,
  serializeCV,
  standardPrincipalCV,
} from '@stacks/transactions';
import { requestLeatherProvider } from '@tests/leather-provider';
import {
  TEST_ACCOUNT_1_PUBKEY,
  TEST_ACCOUNT_2_STX_ADDRESS,
  TEST_ACCOUNT_3_PUBKEY,
  TEST_TESTNET_ACCOUNT_2_BTC_ADDRESS,
} from '@tests/mocks/constants';
import { mockTestAccountBtcBroadcastTransaction } from '@tests/mocks/mock-bitcoin-tx';
import { mockLeatherApiRequests } from '@tests/mocks/mock-leather-api';
import { mockFundedStacksAddress } from '@tests/mocks/mock-multisig';
import { mockStacksTokenContract } from '@tests/mocks/mock-stacks-contract';
import { getConnectedTestAppPermissionsState } from '@tests/page-object-models/onboarding.page';
import { generateMultisigUnsignedStxTransfer, generateUnsignedStxTransfer } from '@tests/utils';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { test } from '../../fixtures/fixtures';

const shotsDir = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../../../../web/app/pages/playground/areas/extension-approval-screens/shots'
);

const popupViewport = { width: 390, height: 756 };

const disableAnimationsCss =
  '*, *::before, *::after { animation: none !important; transition: none !important; caret-color: transparent !important; }';

const largeMicroStxAmount = 1_234_567_000_000;
const smallMicroStxAmount = 500;
const multisigFee = 100;
const multisigThreshold = 2;
const multisigNonce = 0;

const bnsContract = {
  contract: 'SP000000000000000000002Q6VF78.bns',
  functionName: 'name-transfer',
  functionArgs: [
    bufferCVFromString('id'),
    bufferCVFromString('test'),
    standardPrincipalCV(TEST_ACCOUNT_2_STX_ADDRESS),
    noneCV(),
  ].map(arg => serializeCV(arg)),
};

const stacksTransactionAnchors = ['Total spend', 'Standard'];

function request(page: Page, method: string, params: unknown) {
  return page.evaluate(requestLeatherProvider, { method, params });
}

async function saveStableScreenshot(popup: Page, file: string) {
  let previous = await popup.screenshot({ fullPage: true, animations: 'disabled' });
  await test
    .expect(async () => {
      const current = await popup.screenshot({ fullPage: true, animations: 'disabled' });
      const isStable = current.equals(previous);
      previous = current;
      test.expect(isStable).toBe(true);
    })
    .toPass();
  await mkdir(shotsDir, { recursive: true });
  await writeFile(path.join(shotsDir, file), previous);
}

function captureApprovalScreen(context: BrowserContext, file: string, anchors: string[]) {
  return async () => {
    const popup = await context.waitForEvent('page');
    await popup.setViewportSize(popupViewport);
    await popup.waitForLoadState('domcontentloaded');
    await popup.addStyleTag({ content: disableAnimationsCss });
    for (const anchor of anchors) {
      await test.expect(popup.getByText(anchor, { exact: true }).first()).toBeVisible();
    }
    await saveStableScreenshot(popup, file);
    await popup.close();
    return file;
  };
}

async function captureWhileRequesting(
  context: BrowserContext,
  requestPromise: Promise<unknown>,
  file: string,
  anchors: string[]
) {
  const [, captured] = await Promise.all([
    requestPromise,
    captureApprovalScreen(context, file, anchors)(),
  ]);
  return captured;
}

async function mockBitcoinPopupRequests(context: BrowserContext) {
  const popup = await context.waitForEvent('page');
  await mockLeatherApiRequests(popup);
  await mockTestAccountBtcBroadcastTransaction(popup);
}

test.describe('Screenshots: dApp approval screens', () => {
  test.describe('connected origin', () => {
    test.beforeEach(async ({ extensionId, globalPage, onboardingPage, page }) => {
      await globalPage.setupAndUseApiCalls(extensionId);
      await onboardingPage.signInWithTestAccount(
        extensionId,
        getConnectedTestAppPermissionsState()
      );
      await page.goto('localhost:3000');
    });

    test('stx_callContract', async ({ page, context }) => {
      const file = await captureWhileRequesting(
        context,
        request(page, 'stx_callContract', bnsContract),
        '01-stx-call-contract.png',
        ['Sign contract', 'name-transfer', ...stacksTransactionAnchors]
      );
      test.expect(file).toBe('01-stx-call-contract.png');
    });

    test('stx_callContract in allow mode', async ({ page, context }) => {
      const file = await captureWhileRequesting(
        context,
        request(page, 'stx_callContract', {
          ...bnsContract,
          postConditions: [],
          postConditionMode: 'allow',
        }),
        '02-stx-call-contract-allow-mode.png',
        [
          'Sign contract',
          'This transaction can transfer any of your assets',
          'name-transfer',
          ...stacksTransactionAnchors,
        ]
      );
      test.expect(file).toBe('02-stx-call-contract-allow-mode.png');
    });

    test('stx_deployContract', async ({ page, context }) => {
      const file = await captureWhileRequesting(
        context,
        request(page, 'stx_deployContract', {
          name: 'mock-contract-name',
          clarityCode: mockStacksTokenContract,
          clarityVersion: ClarityVersion.Clarity3,
        }),
        '03-stx-deploy-contract.png',
        ['Deploy contract', 'mock-contract-name', ...stacksTransactionAnchors]
      );
      test.expect(file).toBe('03-stx-deploy-contract.png');
    });

    test('stx_signTransaction single-sig', async ({ page, context }) => {
      const txHex = await generateUnsignedStxTransfer(
        TEST_ACCOUNT_2_STX_ADDRESS,
        smallMicroStxAmount,
        'mainnet',
        TEST_ACCOUNT_3_PUBKEY
      );
      const file = await captureWhileRequesting(
        context,
        request(page, 'stx_signTransaction', { txHex, network: 'mainnet' }),
        '04-stx-sign-transaction-single-sig.png',
        ['Sign transaction', '0.0005 STX', ...stacksTransactionAnchors]
      );
      test.expect(file).toBe('04-stx-sign-transaction-single-sig.png');
    });

    test('stx_signTransaction single-sig within balance', async ({ page, context }) => {
      const txHex = await generateUnsignedStxTransfer(
        TEST_ACCOUNT_2_STX_ADDRESS,
        smallMicroStxAmount,
        'mainnet',
        TEST_ACCOUNT_3_PUBKEY
      );
      await mockFundedStacksAddress(
        context,
        getAddressFromPublicKey(TEST_ACCOUNT_3_PUBKEY, 'mainnet')
      );
      const file = await captureWhileRequesting(
        context,
        request(page, 'stx_signTransaction', { txHex, network: 'mainnet' }),
        '05-stx-sign-transaction-within-balance.png',
        ['Sign transaction', '0.0005 STX', 'Approve', ...stacksTransactionAnchors]
      );
      test.expect(file).toBe('05-stx-sign-transaction-within-balance.png');
    });

    test('stx_signTransaction multisig', async ({ page, context }) => {
      const txHex = await generateMultisigUnsignedStxTransfer(
        TEST_ACCOUNT_2_STX_ADDRESS,
        smallMicroStxAmount,
        multisigFee,
        'mainnet',
        [TEST_ACCOUNT_3_PUBKEY, TEST_ACCOUNT_1_PUBKEY],
        multisigThreshold,
        multisigNonce
      );
      const file = await captureWhileRequesting(
        context,
        request(page, 'stx_signTransaction', { txHex, network: 'mainnet' }),
        '06-stx-sign-transaction-multisig.png',
        ['Sign transaction', '0.0005 STX', 'Total spend']
      );
      test.expect(file).toBe('06-stx-sign-transaction-multisig.png');
    });

    test('stx_transferStx large amount', async ({ page, context }) => {
      const file = await captureWhileRequesting(
        context,
        request(page, 'stx_transferStx', {
          amount: largeMicroStxAmount,
          recipient: TEST_ACCOUNT_2_STX_ADDRESS,
        }),
        '07-stx-transfer-stx-large-amount.png',
        ['Send token', 'Memo', ...stacksTransactionAnchors]
      );
      test.expect(file).toBe('07-stx-transfer-stx-large-amount.png');
    });

    test('stx_transferStx within balance', async ({ page, context }) => {
      const file = await captureWhileRequesting(
        context,
        request(page, 'stx_transferStx', {
          amount: smallMicroStxAmount,
          recipient: TEST_ACCOUNT_2_STX_ADDRESS,
        }),
        '08-stx-transfer-stx-within-balance.png',
        ['Send token', '0.0005 STX', ...stacksTransactionAnchors]
      );
      test.expect(file).toBe('08-stx-transfer-stx-within-balance.png');
    });

    test('sendTransfer', async ({ page, context }) => {
      void mockBitcoinPopupRequests(context);
      const file = await captureWhileRequesting(
        context,
        request(page, 'sendTransfer', {
          recipients: [{ address: TEST_TESTNET_ACCOUNT_2_BTC_ADDRESS, amount: '800' }],
          network: 'testnet4',
        }),
        '09-send-transfer.png',
        ['Send token', 'Bitcoin', 'Total spend']
      );
      test.expect(file).toBe('09-send-transfer.png');
    });

    test('stx_signMessage', async ({ page, context }) => {
      const file = await captureWhileRequesting(
        context,
        request(page, 'stx_signMessage', { message: 'test', messageType: 'utf8' }),
        '11-stx-sign-message.png',
        ['Sign message', 'Sign']
      );
      test.expect(file).toBe('11-stx-sign-message.png');
    });

    test('signMessage BIP-322', async ({ page, context }) => {
      const file = await captureWhileRequesting(
        context,
        request(page, 'signMessage', { message: 'test', paymentType: 'p2wpkh' }),
        '12-sign-message-bip322.png',
        ['Sign message', 'Sign']
      );
      test.expect(file).toBe('12-sign-message-bip322.png');
    });
  });

  test.describe('new origin', () => {
    test.beforeEach(async ({ extensionId, globalPage, onboardingPage, page }) => {
      await globalPage.setupAndUseApiCalls(extensionId);
      await onboardingPage.signInWithTestAccount(extensionId);
      await page.goto('localhost:3000');
    });

    test('getAddresses', async ({ page, context }) => {
      const file = await captureWhileRequesting(
        context,
        request(page, 'getAddresses', {}),
        '10-get-addresses.png',
        ['Connect app', 'Account 1', 'Confirm']
      );
      test.expect(file).toBe('10-get-addresses.png');
    });
  });
});
