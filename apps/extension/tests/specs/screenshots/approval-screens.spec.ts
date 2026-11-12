import type { BrowserContext, Page } from '@playwright/test';
import {
  ClarityVersion,
  bufferCVFromString,
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
import { mockStacksTokenContract } from '@tests/mocks/mock-stacks-contract';
import { getConnectedTestAppPermissionsState } from '@tests/page-object-models/onboarding.page';
import { generateMultisigUnsignedStxTransfer, generateUnsignedStxTransfer } from '@tests/utils';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { RpcErrorMessage } from '@shared/rpc/methods/validation.utils';

import { test } from '../../fixtures/fixtures';

const shotsDir = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../../../../web/app/pages/playground/areas/extension-approval-screens/shots'
);

const popupViewport = { width: 390, height: 756 };

const disableMotionStyle = `
  *, *::before, *::after {
    animation: none !important;
    transition: none !important;
    caret-color: transparent !important;
  }
`;

const contractCallParams = {
  contract: 'SP000000000000000000002Q6VF78.bns',
  functionName: 'name-transfer',
  functionArgs: [
    bufferCVFromString('id'),
    bufferCVFromString('test'),
    standardPrincipalCV(TEST_ACCOUNT_2_STX_ADDRESS),
    noneCV(),
  ].map(arg => serializeCV(arg)),
};

const largeAmountMicroStx = 1_234_567_890_000;
const withinBalanceAmountMicroStx = 500;

interface ApprovalScreenCapture {
  name: string;
  anchors: string[];
  isConnected: boolean;
  request(page: Page): Promise<unknown>;
  mockPopup?(popup: Page): Promise<void>;
}

function sendRequest(page: Page, method: string, params: unknown) {
  return page.evaluate(requestLeatherProvider, { method, params });
}

const captures: ApprovalScreenCapture[] = [
  {
    name: '01-stx-call-contract',
    anchors: ['Sign contract', 'name-transfer'],
    isConnected: true,
    request: page => sendRequest(page, 'stx_callContract', contractCallParams),
  },
  {
    name: '02-stx-call-contract-allow-mode',
    anchors: ['Sign contract', 'This transaction can transfer any of your assets', 'name-transfer'],
    isConnected: true,
    request: page =>
      sendRequest(page, 'stx_callContract', { ...contractCallParams, postConditionMode: 'allow' }),
  },
  {
    name: '03-stx-deploy-contract',
    anchors: ['Deploy contract', 'mock-contract-name'],
    isConnected: true,
    request: page =>
      sendRequest(page, 'stx_deployContract', {
        name: 'mock-contract-name',
        clarityCode: mockStacksTokenContract,
        clarityVersion: ClarityVersion.Clarity3,
      }),
  },
  {
    name: '04-stx-sign-transaction-single-sig',
    anchors: ['Sign transaction', 'Stacks blockchain'],
    isConnected: true,
    async request(page) {
      const txHex = await generateUnsignedStxTransfer(
        TEST_ACCOUNT_2_STX_ADDRESS,
        largeAmountMicroStx,
        'mainnet',
        TEST_ACCOUNT_3_PUBKEY
      );
      return sendRequest(page, 'stx_signTransaction', { txHex, network: 'mainnet' });
    },
  },
  {
    name: '05-stx-sign-transaction-single-sig-within-balance',
    anchors: ['Sign transaction', '0.0005 STX'],
    isConnected: true,
    async request(page) {
      const txHex = await generateUnsignedStxTransfer(
        TEST_ACCOUNT_2_STX_ADDRESS,
        withinBalanceAmountMicroStx,
        'mainnet',
        TEST_ACCOUNT_3_PUBKEY
      );
      return sendRequest(page, 'stx_signTransaction', { txHex, network: 'mainnet' });
    },
  },
  {
    name: '06-stx-sign-transaction-multisig',
    anchors: ['Sign transaction', '0.0005 STX'],
    isConnected: true,
    async request(page) {
      const txHex = await generateMultisigUnsignedStxTransfer(
        TEST_ACCOUNT_2_STX_ADDRESS,
        withinBalanceAmountMicroStx,
        100,
        'mainnet',
        [TEST_ACCOUNT_3_PUBKEY, TEST_ACCOUNT_1_PUBKEY],
        2,
        0
      );
      return sendRequest(page, 'stx_signTransaction', { txHex, network: 'mainnet' });
    },
  },
  {
    name: '07-stx-transfer-stx-large-amount',
    anchors: ['Send token', 'Stacks blockchain'],
    isConnected: true,
    request: page =>
      sendRequest(page, 'stx_transferStx', {
        amount: largeAmountMicroStx,
        recipient: TEST_ACCOUNT_2_STX_ADDRESS,
      }),
  },
  {
    name: '08-stx-transfer-stx-within-balance',
    anchors: ['Send token', '0.0001 STX'],
    isConnected: true,
    request: page =>
      sendRequest(page, 'stx_transferStx', {
        amount: 100,
        memo: 'mock-memo',
        recipient: TEST_ACCOUNT_2_STX_ADDRESS,
      }),
  },
  {
    name: '09-send-transfer',
    anchors: ['Send token', 'Bitcoin'],
    isConnected: true,
    request: page =>
      sendRequest(page, 'sendTransfer', {
        recipients: [{ address: TEST_TESTNET_ACCOUNT_2_BTC_ADDRESS, amount: '800' }],
        network: 'testnet4',
      }),
    async mockPopup(popup) {
      await mockLeatherApiRequests(popup);
      await mockTestAccountBtcBroadcastTransaction(popup);
    },
  },
  {
    name: '10-get-addresses',
    anchors: ['Connect app'],
    isConnected: false,
    request: page => sendRequest(page, 'getAddresses', undefined),
  },
  {
    name: '11-stx-sign-message',
    anchors: ['Sign message', 'Hello from the approval screens'],
    isConnected: true,
    request: page =>
      sendRequest(page, 'stx_signMessage', {
        message: 'Hello from the approval screens',
        messageType: 'utf8',
      }),
  },
  {
    name: '12-sign-message-bip322',
    anchors: ['Sign message', 'Hello from the approval screens'],
    isConnected: true,
    request: page =>
      sendRequest(page, 'signMessage', {
        message: 'Hello from the approval screens',
        paymentType: 'p2wpkh',
      }),
  },
];

async function captureApprovalScreen(context: BrowserContext, capture: ApprovalScreenCapture) {
  const popup = await context.waitForEvent('page');
  await capture.mockPopup?.(popup);
  await popup.setViewportSize(popupViewport);
  await popup.addStyleTag({ content: disableMotionStyle });
  for (const anchor of capture.anchors) {
    await test.expect(popup.getByText(anchor, { exact: true }).first()).toBeVisible();
  }
  await test.expect.poll(() => popup.evaluate(() => document.getAnimations().length)).toBe(0);
  await popup.screenshot({ path: path.join(shotsDir, `${capture.name}.png`), fullPage: true });
  await popup.close();
}

test.describe('Approval screen screenshots', () => {
  for (const capture of captures) {
    test(capture.name, async ({ context, extensionId, globalPage, onboardingPage, page }) => {
      await globalPage.setupAndUseApiCalls(extensionId);
      await onboardingPage.signInWithTestAccount(
        extensionId,
        capture.isConnected ? getConnectedTestAppPermissionsState() : undefined
      );
      await page.goto('localhost:3000');

      const [result] = await Promise.all([
        capture.request(page),
        captureApprovalScreen(context, capture),
      ]);

      test.expect(result).toMatchObject({
        error: { code: 4001, message: RpcErrorMessage.UserRejectedOperation },
      });
    });
  }
});
