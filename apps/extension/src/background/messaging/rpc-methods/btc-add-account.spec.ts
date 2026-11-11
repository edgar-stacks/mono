import { sha256 } from '@noble/hashes/sha256';
import { bytesToHex } from '@noble/hashes/utils';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import { makeNativeSegwitAccountXpub, makeNativeSegwitAddressPubkeyHex } from '@leather.io/bitcoin';
import { RpcErrorCode, maxBtcDescriptorLength } from '@leather.io/rpc';

import { createMockPort } from '../create-mock-port';
import type * as RpcRequestUtils from '../rpc-request-utils';
import { btcAddAccountHandler } from './btc-add-account';

type BtcAddAccountRequest = Parameters<(typeof btcAddAccountHandler)[1]>[0];

const mocks = vi.hoisted(() => ({
  createConnectingAppMetadataSearchParams: vi.fn(),
  triggerRequestPopupWindowOpen: vi.fn(),
  sendErrorResponseOnUserPopupClose: vi.fn(),
  trackRpcRequestError: vi.fn(),
  trackRpcRequestSuccess: vi.fn(),
  sendMessage: vi.fn(),
}));

vi.mock('../define-rpc-request-handler', () => ({
  defineRpcRequestHandler: (method: string, handler: unknown) => [method, handler],
}));

vi.mock('../rpc-request-utils', async importOriginal => {
  const actual = await importOriginal<typeof RpcRequestUtils>();
  return {
    validateRequestParams: actual.validateRequestParams,
    getOriginatingFrameFromPort: actual.getOriginatingFrameFromPort,
    createConnectingAppMetadataSearchParams: mocks.createConnectingAppMetadataSearchParams,
    triggerRequestPopupWindowOpen: mocks.triggerRequestPopupWindowOpen,
    sendErrorResponseOnUserPopupClose: mocks.sendErrorResponseOnUserPopupClose,
  };
});

vi.mock('../rpc-helpers', () => ({
  trackRpcRequestError: mocks.trackRpcRequestError,
  trackRpcRequestSuccess: mocks.trackRpcRequestSuccess,
}));

const frameId = 42;
const tabId = 7;
const requestingOrigin = 'https://app.example.com';

const xpubA = makeNativeSegwitAccountXpub(1);
const xpubB = makeNativeSegwitAccountXpub(2);
const counterpartyKey = makeNativeSegwitAddressPubkeyHex(9);
const hash = bytesToHex(sha256(new Uint8Array([1, 2, 3])));
const unlockHeight = 900_000;

const multisigDescriptor = `wsh(sortedmulti(2,${xpubA}/0/0,${xpubB}/0/0))`;

function makeBondDescriptor(vault: string) {
  return `wsh(and_v(v:or_i(after(${unlockHeight}),and_v(v:sha256(${hash}),pk(${counterpartyKey}))),${vault}))`;
}

function makeRequest(descriptor: string): BtcAddAccountRequest {
  return {
    jsonrpc: '2.0',
    id: 'req-1',
    method: 'btc_addAccount',
    params: { descriptor, name: 'Vault' },
  };
}

function invokeHandler(request: BtcAddAccountRequest) {
  const [, handler] = btcAddAccountHandler;
  return handler(request, createMockPort({ frameId, url: requestingOrigin, tab: { id: tabId } }));
}

function objectContaining(expected: Record<string, unknown>): unknown {
  return expect.objectContaining(expected);
}

function expectInvalidParamsError(message?: string) {
  expect(mocks.sendMessage).toHaveBeenCalledWith(
    tabId,
    objectContaining({
      error: objectContaining({
        code: RpcErrorCode.INVALID_PARAMS,
        ...(message ? { message } : {}),
      }),
    }),
    { frameId }
  );
  expect(mocks.triggerRequestPopupWindowOpen).not.toHaveBeenCalled();
}

const unsupportedDescriptorMessage = 'Only multisig or timelocked wsh() descriptors are supported';

describe('btcAddAccountHandler', () => {
  beforeEach(() => {
    vi.stubGlobal('chrome', { tabs: { sendMessage: mocks.sendMessage } });
    mocks.createConnectingAppMetadataSearchParams.mockReturnValue({
      frameId,
      urlParams: new URLSearchParams(),
      tabId,
    });
    mocks.triggerRequestPopupWindowOpen.mockResolvedValue({ id: 1 });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  test('opens the popup for a plain multisig descriptor', async () => {
    await invokeHandler(makeRequest(multisigDescriptor));

    expect(mocks.sendMessage).not.toHaveBeenCalled();
    expect(mocks.triggerRequestPopupWindowOpen).toHaveBeenCalled();
    expect(mocks.sendErrorResponseOnUserPopupClose).toHaveBeenCalled();
  });

  test.each([
    ['sortedmulti', `sortedmulti(2,${xpubA}/0/0,${xpubB}/0/0)`],
    ['multi', `multi(1,${xpubA}/0/0,${makeNativeSegwitAddressPubkeyHex(2)})`],
    ['pk', `pk(${xpubA}/0/0)`],
  ])('opens the popup for a bond with a %s vault', async (_, vault) => {
    await invokeHandler(makeRequest(makeBondDescriptor(vault)));

    expect(mocks.sendMessage).not.toHaveBeenCalled();
    expect(mocks.triggerRequestPopupWindowOpen).toHaveBeenCalled();
  });

  test('rejects miniscript that merely wraps a multi leaf', async () => {
    await invokeHandler(
      makeRequest(`wsh(and_v(v:pk(${xpubB}/0/1),multi(1,${xpubA}/0/0,${xpubB}/0/0)))`)
    );

    expectInvalidParamsError(unsupportedDescriptorMessage);
  });

  test('rejects non-bond miniscript', async () => {
    await invokeHandler(makeRequest(`wsh(or_d(pk(${xpubA}/0/0),pk(${xpubB}/0/0)))`));

    expectInvalidParamsError(unsupportedDescriptorMessage);
  });

  test('rejects a ranged bond', async () => {
    await invokeHandler(makeRequest(makeBondDescriptor(`pk(${xpubA}/0/*)`)));

    expectInvalidParamsError(unsupportedDescriptorMessage);
  });

  test('rejects a multisig that does not compile', async () => {
    await invokeHandler(makeRequest('wsh(multi(1,not-a-key,also-not-a-key))'));

    expectInvalidParamsError(unsupportedDescriptorMessage);
  });

  test('rejects an over-length descriptor', async () => {
    await invokeHandler(makeRequest(`wsh(${'a'.repeat(maxBtcDescriptorLength)})`));

    expectInvalidParamsError();
  });
});
