import { type BrowserContext, type Page } from '@playwright/test';
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
  TEST_ACCOUNT_1_STX_PUBKEY,
  TEST_ACCOUNT_2_STX_ADDRESS,
  TEST_ACCOUNT_3_PUBKEY,
  TEST_TESTNET_ACCOUNT_2_BTC_ADDRESS,
} from '@tests/mocks/constants';
import { mockLeatherApiRequests } from '@tests/mocks/mock-leather-api';
import { mockStacksTokenContract } from '@tests/mocks/mock-stacks-contract';
import { getConnectedTestAppPermissionsState } from '@tests/page-object-models/onboarding.page';
import {
  expectToSettleAt,
  generateMultisigUnsignedStxTransfer,
  generateUnsignedStxTransfer,
} from '@tests/utils';
import { fileURLToPath } from 'node:url';

import { test } from '../../fixtures/fixtures';

const shotsDir = fileURLToPath(
  new URL(
    '../../../../web/app/pages/playground/areas/extension-approval-screens/shots/',
    import.meta.url
  )
);

const popupViewport = { width: 390, height: 756 };

const disableAnimationsStyle = `
  *, *::before, *::after {
    animation-duration: 0s !important;
    animation-delay: 0s !important;
    transition-duration: 0s !important;
    transition-delay: 0s !important;
  }
`;

const largeStxTransferAmount = 1_234_567_000_000;
const smallStxTransferAmount = 100;
const unsignedTransferAmount = 500;
const multisigFee = 100;
const multisigThreshold = 2;
const multisigNonce = 0;

const bnsNameTransferArgs = [
  bufferCVFromString('id'),
  bufferCVFromString('test'),
  standardPrincipalCV(TEST_ACCOUNT_2_STX_ADDRESS),
  noneCV(),
].map(arg => serializeCV(arg));

interface ApprovalScreenShot {
  name: string;
  method: string;
  anchor: string;
  ready: string;
  getParams(): unknown;
  setup?(context: BrowserContext): Promise<void>;
}

const shots: ApprovalScreenShot[] = [
  {
    name: '01-stx-call-contract',
    method: 'stx_callContract',
    anchor: 'Sign contract',
    ready: 'Total spend',
    getParams: () => ({
      contract: 'SP000000000000000000002Q6VF78.bns',
      functionName: 'name-transfer',
      functionArgs: bnsNameTransferArgs,
    }),
  },
  {
    name: '02-stx-call-contract-allow-mode',
    method: 'stx_callContract',
    anchor: 'This transaction can transfer any of your assets',
    ready: 'Total spend',
    getParams: () => ({
      contract: 'SP000000000000000000002Q6VF78.bns',
      functionName: 'name-transfer',
      functionArgs: bnsNameTransferArgs,
      postConditions: [],
      postConditionMode: 'allow',
    }),
  },
  {
    name: '03-stx-deploy-contract',
    method: 'stx_deployContract',
    anchor: 'Deploy contract',
    ready: 'Total spend',
    getParams: () => ({
      name: 'mock-contract-name',
      clarityCode: mockStacksTokenContract,
      clarityVersion: ClarityVersion.Clarity3,
    }),
  },
  {
    name: '04-stx-sign-transaction-single-sig',
    method: 'stx_signTransaction',
    anchor: 'Sign transaction',
    ready: 'Total spend',
    getParams: async () => ({
      transaction: await generateUnsignedStxTransfer(
        TEST_ACCOUNT_2_STX_ADDRESS,
        unsignedTransferAmount,
        'mainnet',
        TEST_ACCOUNT_3_PUBKEY
      ),
    }),
  },
  {
    name: '05-stx-sign-transaction-single-sig-within-balance',
    method: 'stx_signTransaction',
    anchor: 'Sign transaction',
    ready: 'Total spend',
    getParams: async () => ({
      transaction: await generateUnsignedStxTransfer(
        TEST_ACCOUNT_2_STX_ADDRESS,
        unsignedTransferAmount,
        'mainnet',
        TEST_ACCOUNT_1_STX_PUBKEY
      ),
    }),
  },
  {
    name: '06-stx-sign-transaction-multisig',
    method: 'stx_signTransaction',
    anchor: 'Sign transaction',
    ready: 'Total spend',
    getParams: async () => ({
      transaction: await generateMultisigUnsignedStxTransfer(
        TEST_ACCOUNT_2_STX_ADDRESS,
        unsignedTransferAmount,
        multisigFee,
        'mainnet',
        [TEST_ACCOUNT_3_PUBKEY, TEST_ACCOUNT_1_PUBKEY],
        multisigThreshold,
        multisigNonce
      ),
    }),
  },
  {
    name: '07-stx-transfer-stx-large-amount',
    method: 'stx_transferStx',
    anchor: 'Send token',
    ready: 'Total spend',
    getParams: () => ({
      amount: largeStxTransferAmount,
      memo: 'mock-memo',
      recipient: TEST_ACCOUNT_2_STX_ADDRESS,
    }),
  },
  {
    name: '08-stx-transfer-stx-within-balance',
    method: 'stx_transferStx',
    anchor: 'Send token',
    ready: 'Total spend',
    getParams: () => ({
      amount: smallStxTransferAmount,
      memo: 'mock-memo',
      recipient: TEST_ACCOUNT_2_STX_ADDRESS,
    }),
  },
  {
    name: '09-send-transfer',
    method: 'sendTransfer',
    anchor: 'Send token',
    ready: 'Total spend',
    getParams: () => ({
      recipients: [{ address: TEST_TESTNET_ACCOUNT_2_BTC_ADDRESS, amount: '800' }],
      network: 'testnet4',
    }),
    setup: mockLeatherApiRequests,
  },
  {
    name: '10-get-addresses',
    method: 'getAddresses',
    anchor: 'Connect app',
    ready: 'Confirm',
    getParams: () => undefined,
  },
  {
    name: '11-stx-sign-message',
    method: 'stx_signMessage',
    anchor: 'Sign message',
    ready: 'Sign',
    getParams: () => ({ message: 'Approval screens preview', messageType: 'utf8' }),
  },
  {
    name: '12-sign-message-bip322',
    method: 'signMessage',
    anchor: 'Sign message',
    ready: 'Sign',
    getParams: () => ({ message: 'Approval screens preview', paymentType: 'p2wpkh' }),
  },
];

function countRunningAnimations(popup: Page) {
  return popup.evaluate(() => document.getAnimations().length);
}

function captureApprovalScreen(
  context: BrowserContext,
  { name, anchor, ready }: ApprovalScreenShot
) {
  return async () => {
    const popup = await context.waitForEvent('page');
    await popup.setViewportSize(popupViewport);
    await popup.addStyleTag({ content: disableAnimationsStyle });
    await test.expect(popup.getByText(anchor, { exact: true })).toBeVisible();
    await test.expect(popup.getByText(ready, { exact: true })).toBeVisible();
    await expectToSettleAt(() => countRunningAnimations(popup), 0);
    await popup.screenshot({ path: `${shotsDir}${name}.png`, fullPage: true });
    await popup.close();
  };
}

async function sendRequest(page: Page, { method, getParams }: ApprovalScreenShot) {
  const params = await getParams();
  return page.evaluate(requestLeatherProvider, { method, params });
}

test.describe('Screenshots: dApp approval screens', () => {
  test.beforeEach(async ({ extensionId, globalPage, onboardingPage, page }) => {
    await globalPage.setupAndUseApiCalls(extensionId);
    await onboardingPage.signInWithTestAccount(extensionId, getConnectedTestAppPermissionsState());
    await page.goto('localhost:3000');
  });

  shots.forEach(shot => {
    test(`captures ${shot.name}`, async ({ page, context }) => {
      await shot.setup?.(context);

      const [result] = await Promise.all([
        sendRequest(page, shot),
        captureApprovalScreen(context, shot)(),
      ]);

      test.expect(result).toHaveProperty('error');
    });
  });
});
