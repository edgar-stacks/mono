import { sha256 } from '@noble/hashes/sha256';
import { bytesToHex } from '@noble/hashes/utils';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { type z } from 'zod';

import {
  instantiateBondDescriptor,
  makeNativeSegwitAccountXpub,
  makeNativeSegwitAddressPubkeyHex,
} from '@leather.io/bitcoin';
import { RpcErrorCode, maxBtcDescriptorLength } from '@leather.io/rpc';

import { createMockPort } from '../create-mock-port';
import { btcAddAccountHandler } from './btc-add-account';

type BtcAddAccountRequest = Parameters<(typeof btcAddAccountHandler)[1]>[0];

interface ValidateRequestParamsMockArgs {
  params: unknown;
  schema: z.ZodType;
}

const mocks = vi.hoisted(() => ({
  triggerRequestPopupWindowOpen: vi.fn(),
  sendErrorResponseOnUserPopupClose: vi.fn(),
  trackRpcRequestError: vi.fn(),
  trackRpcRequestSuccess: vi.fn(),
  sendMessage: vi.fn(),
}));

vi.mock('../define-rpc-request-handler', () => ({
  defineRpcRequestHandler: (method: string, handler: unknown) => [method, handler],
}));

vi.mock('../rpc-request-utils', () => ({
  getOriginatingFrameFromPort: (port: chrome.runtime.Port) => ({
    frameId: port.sender?.frameId ?? 0,
    tabId: port.sender?.tab?.id ?? 0,
  }),
  createConnectingAppMetadataSearchParams: (port: chrome.runtime.Port) => ({
    frameId: port.sender?.frameId ?? 0,
    tabId: port.sender?.tab?.id ?? 0,
    urlParams: new URLSearchParams(),
  }),
  validateRequestParams: ({ params, schema }: ValidateRequestParamsMockArgs) => ({
    status: schema.safeParse(params).success ? 'success' : 'failure',
  }),
  triggerRequestPopupWindowOpen: mocks.triggerRequestPopupWindowOpen,
  sendErrorResponseOnUserPopupClose: mocks.sendErrorResponseOnUserPopupClose,
}));

vi.mock('../rpc-helpers', () => ({
  trackRpcRequestError: mocks.trackRpcRequestError,
  trackRpcRequestSuccess: mocks.trackRpcRequestSuccess,
}));

const frameId = 42;
const tabId = 7;

const xpubA = makeNativeSegwitAccountXpub(1);
const xpubB = makeNativeSegwitAccountXpub(2);
const counterpartyKey = makeNativeSegwitAddressPubkeyHex(9);
const hash = bytesToHex(sha256(new Uint8Array([1, 2, 3])));
const unlockHeight = 900_000;

const multisigDescriptor = `wsh(sortedmulti(2,${xpubA}/0/0,${xpubB}/0/0))`;
const bondDescriptor = instantiateBondDescriptor({
  unlockHeight,
  hash,
  counterpartyKey,
  threshold: 2,
  keyExpressions: [`${xpubA}/0/0`, `${xpubB}/0/0`],
});

function makeBondDescriptor(vaultExpression: string) {
  return `wsh(and_v(v:or_i(after(${unlockHeight}),and_v(v:sha256(${hash}),pk(${counterpartyKey}))),${vaultExpression}))`;
}

function makeRequest(descriptor: string): BtcAddAccountRequest {
  return {
    jsonrpc: '2.0',
    id: 'req-1',
    method: 'btc_addAccount',
    params: { descriptor, name: 'Vault' },
  };
}

function invokeHandler(descriptor: string) {
  const [, handler] = btcAddAccountHandler;
  return handler(
    makeRequest(descriptor),
    createMockPort({ frameId, url: 'https://app.example.com', tab: { id: tabId } })
  );
}

function objectContaining(expected: Record<string, unknown>): unknown {
  return expect.objectContaining(expected);
}

function expectRejected() {
  expect(mocks.sendMessage).toHaveBeenCalledWith(
    tabId,
    objectContaining({
      error: objectContaining({
        code: RpcErrorCode.INVALID_PARAMS,
        message: 'Only multisig or timelocked wsh() descriptors are supported',
      }),
    }),
    { frameId }
  );
  expect(mocks.triggerRequestPopupWindowOpen).not.toHaveBeenCalled();
}

function expectPopupOpened() {
  expect(mocks.sendMessage).not.toHaveBeenCalled();
  expect(mocks.triggerRequestPopupWindowOpen).toHaveBeenCalled();
  expect(mocks.sendErrorResponseOnUserPopupClose).toHaveBeenCalled();
}

describe('btcAddAccountHandler', () => {
  beforeEach(() => {
    vi.stubGlobal('chrome', { tabs: { sendMessage: mocks.sendMessage } });
    mocks.triggerRequestPopupWindowOpen.mockResolvedValue({ id: 1 });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  test('opens the popup for a multisig descriptor', async () => {
    await invokeHandler(multisigDescriptor);
    expectPopupOpened();
  });

  test('opens the popup for a bond descriptor with a multi vault', async () => {
    await invokeHandler(bondDescriptor);
    expectPopupOpened();
  });

  test('opens the popup for a bond descriptor with a single-key vault', async () => {
    await invokeHandler(makeBondDescriptor(`pk(${xpubA}/0/0)`));
    expectPopupOpened();
  });

  test('opens the popup for a bond descriptor with raw vault keys', async () => {
    await invokeHandler(
      makeBondDescriptor(
        `multi(1,${makeNativeSegwitAddressPubkeyHex(1)},${makeNativeSegwitAddressPubkeyHex(2)})`
      )
    );
    expectPopupOpened();
  });

  test('rejects miniscript that is not the bond template', async () => {
    await invokeHandler(`wsh(and_v(v:pk(${xpubA}/0/0),pk(${xpubB}/0/0)))`);
    expectRejected();
  });

  test('rejects miniscript that wraps a multi leaf', async () => {
    await invokeHandler(`wsh(or_d(multi(1,${xpubA}/0/0,${xpubB}/0/0),older(10)))`);
    expectRejected();
  });

  test('rejects a ranged bond descriptor', async () => {
    await invokeHandler(makeBondDescriptor(`sortedmulti(2,${xpubA}/0/*,${xpubB}/0/*)`));
    expectRejected();
  });

  test('rejects a structurally valid multisig that does not compile', async () => {
    await invokeHandler('wsh(multi(1,not-a-key,also-not-a-key))');
    expectRejected();
  });

  test('stops at param validation for an over-length descriptor', async () => {
    await invokeHandler(`${multisigDescriptor}${' '.repeat(maxBtcDescriptorLength)}`);
    expect(mocks.triggerRequestPopupWindowOpen).not.toHaveBeenCalled();
  });
});
