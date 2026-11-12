import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import { RpcErrorCode } from '@leather.io/rpc';

import { createMockPort } from '../create-mock-port';
import { getAddressesHandler, stxGetAddressesHandler } from './get-addresses';

type GetAddressesRequest = Parameters<(typeof getAddressesHandler)[1]>[0];
type StxGetAddressesRequest = Parameters<(typeof stxGetAddressesHandler)[1]>[0];

const mocks = vi.hoisted(() => ({
  createConnectingAppSearchParamsWithLastKnownAccount:
    vi.fn<
      (
        port: chrome.runtime.Port,
        otherParams: [string, string][],
        options?: { network?: string }
      ) => Promise<{ frameId: number; urlParams: URLSearchParams; tabId: number }>
    >(),
  validateRequestNetwork: vi.fn(),
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
  createConnectingAppSearchParamsWithLastKnownAccount:
    mocks.createConnectingAppSearchParamsWithLastKnownAccount,
  validateRequestNetwork: mocks.validateRequestNetwork,
  triggerRequestPopupWindowOpen: mocks.triggerRequestPopupWindowOpen,
  sendErrorResponseOnUserPopupClose: mocks.sendErrorResponseOnUserPopupClose,
}));

vi.mock('../rpc-helpers', () => ({
  trackRpcRequestError: mocks.trackRpcRequestError,
  trackRpcRequestSuccess: mocks.trackRpcRequestSuccess,
}));

const frameId = 42;
const tabId = 7;

function buildPort() {
  return createMockPort({ frameId, url: 'https://app.example.com', tab: { id: tabId } });
}

function makeRequest(params?: GetAddressesRequest['params']): GetAddressesRequest {
  const request: GetAddressesRequest = { jsonrpc: '2.0', id: 'req-1', method: 'getAddresses' };
  if (params) request.params = params;
  return request;
}

function invokeHandler(request: GetAddressesRequest) {
  const [, handler] = getAddressesHandler;
  return handler(request, buildPort());
}

function invokeStxHandler(request: StxGetAddressesRequest) {
  const [, handler] = stxGetAddressesHandler;
  return handler(request, buildPort());
}

function getForwardedCall() {
  return mocks.createConnectingAppSearchParamsWithLastKnownAccount.mock.calls[0];
}

function objectContaining(expected: Record<string, unknown>): unknown {
  return expect.objectContaining(expected);
}

describe('getAddressesHandler', () => {
  beforeEach(() => {
    vi.stubGlobal('chrome', { tabs: { sendMessage: mocks.sendMessage } });
    mocks.createConnectingAppSearchParamsWithLastKnownAccount.mockResolvedValue({
      frameId,
      urlParams: new URLSearchParams(),
      tabId,
    });
    mocks.validateRequestNetwork.mockResolvedValue({ status: 'success' });
    mocks.triggerRequestPopupWindowOpen.mockResolvedValue({ id: 1 });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  test('opens the popup through the last known account helper without a network', async () => {
    await invokeHandler(makeRequest());

    expect(mocks.validateRequestNetwork).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'req-1', method: 'getAddresses', network: undefined })
    );
    const [, otherParams, options] = getForwardedCall();
    expect(options).toEqual({ network: undefined });
    expect(otherParams.some(([key]) => key === 'network')).toBe(false);
    expect(mocks.triggerRequestPopupWindowOpen).toHaveBeenCalledTimes(1);
    expect(mocks.sendErrorResponseOnUserPopupClose).toHaveBeenCalledTimes(1);
  });

  test('forwards an explicit network to the prefill helper', async () => {
    await invokeHandler(makeRequest({ network: 'testnet4' }));

    expect(mocks.validateRequestNetwork).toHaveBeenCalledWith(
      expect.objectContaining({ network: 'testnet4' })
    );
    const [, , options] = getForwardedCall();
    expect(options).toEqual({ network: 'testnet4' });
  });

  test('does not open the popup when the network is rejected', async () => {
    mocks.validateRequestNetwork.mockResolvedValue({ status: 'failure' });

    await invokeHandler(makeRequest({ network: 'Testnet' }));

    expect(mocks.createConnectingAppSearchParamsWithLastKnownAccount).not.toHaveBeenCalled();
    expect(mocks.triggerRequestPopupWindowOpen).not.toHaveBeenCalled();
  });

  test('rejects invalid params before validating the network', async () => {
    const params = { network: 'mainnet' };
    Reflect.set(params, 'chains', 'not-a-list');
    await invokeHandler(makeRequest(params));

    expect(mocks.validateRequestNetwork).not.toHaveBeenCalled();
    expect(mocks.triggerRequestPopupWindowOpen).not.toHaveBeenCalled();
    expect(mocks.sendMessage).toHaveBeenCalledWith(
      tabId,
      expect.objectContaining({
        error: objectContaining({ code: RpcErrorCode.INVALID_PARAMS }),
      }),
      { frameId }
    );
  });
});

describe('stxGetAddressesHandler', () => {
  beforeEach(() => {
    vi.stubGlobal('chrome', { tabs: { sendMessage: mocks.sendMessage } });
    mocks.createConnectingAppSearchParamsWithLastKnownAccount.mockResolvedValue({
      frameId,
      urlParams: new URLSearchParams(),
      tabId,
    });
    mocks.validateRequestNetwork.mockResolvedValue({ status: 'success' });
    mocks.triggerRequestPopupWindowOpen.mockResolvedValue({ id: 1 });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  test('validates and forwards the requested network', async () => {
    await invokeStxHandler({
      jsonrpc: '2.0',
      id: 'req-2',
      method: 'stx_getAddresses',
      params: { network: 'testnet' },
    });

    expect(mocks.validateRequestNetwork).toHaveBeenCalledWith(
      expect.objectContaining({ method: 'stx_getAddresses', network: 'testnet' })
    );
    const [, , options] = getForwardedCall();
    expect(options).toEqual({ network: 'testnet' });
  });
});
