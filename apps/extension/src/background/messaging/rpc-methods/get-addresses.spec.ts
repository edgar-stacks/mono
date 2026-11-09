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
  triggerRequestPopupWindowOpen: vi.fn(),
  sendErrorResponseOnUserPopupClose: vi.fn(),
  validateRequestNetwork: vi.fn(),
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
  triggerRequestPopupWindowOpen: mocks.triggerRequestPopupWindowOpen,
  sendErrorResponseOnUserPopupClose: mocks.sendErrorResponseOnUserPopupClose,
  validateRequestNetwork: mocks.validateRequestNetwork,
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

function getForwardedOptions() {
  const [, , options] = mocks.createConnectingAppSearchParamsWithLastKnownAccount.mock.calls[0];
  return options;
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
    mocks.triggerRequestPopupWindowOpen.mockResolvedValue({ id: 1 });
    mocks.validateRequestNetwork.mockResolvedValue({ status: 'success' });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  test('leaves network resolution to the shared helper when the request has no params', async () => {
    await invokeHandler(makeRequest());

    expect(mocks.validateRequestNetwork).toHaveBeenCalledWith(
      expect.objectContaining({ method: 'getAddresses', network: undefined })
    );
    expect(getForwardedOptions()).toEqual({ network: undefined });
    expect(mocks.triggerRequestPopupWindowOpen).toHaveBeenCalledTimes(1);
  });

  test('forwards the requested network to the shared helper', async () => {
    await invokeHandler(makeRequest({ network: 'testnet' }));

    expect(mocks.validateRequestNetwork).toHaveBeenCalledWith(
      expect.objectContaining({ network: 'testnet' })
    );
    expect(getForwardedOptions()).toEqual({ network: 'testnet' });
  });

  test('pins the last known account so a bound policy can set the network', async () => {
    await invokeHandler(makeRequest());

    expect(mocks.createConnectingAppSearchParamsWithLastKnownAccount).toHaveBeenCalledTimes(1);
  });

  test('rejects an unknown network without opening the popup', async () => {
    mocks.validateRequestNetwork.mockResolvedValue({ status: 'failure' });

    await invokeHandler(makeRequest({ network: 'Testnet' }));

    expect(mocks.createConnectingAppSearchParamsWithLastKnownAccount).not.toHaveBeenCalled();
    expect(mocks.triggerRequestPopupWindowOpen).not.toHaveBeenCalled();
  });

  test('rejects invalid params before validating the network', async () => {
    const request = makeRequest();
    Reflect.set(request, 'params', { network: 42 });

    await invokeHandler(request);

    expect(mocks.validateRequestNetwork).not.toHaveBeenCalled();
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
    mocks.triggerRequestPopupWindowOpen.mockResolvedValue({ id: 1 });
    mocks.validateRequestNetwork.mockResolvedValue({ status: 'success' });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  test('validates the network under its own method name', async () => {
    const [, handler] = stxGetAddressesHandler;
    const request: StxGetAddressesRequest = {
      jsonrpc: '2.0',
      id: 'req-2',
      method: 'stx_getAddresses',
      params: { network: 'mainnet' },
    };

    await handler(request, buildPort());

    expect(mocks.validateRequestNetwork).toHaveBeenCalledWith(
      expect.objectContaining({ method: 'stx_getAddresses', network: 'mainnet' })
    );
    expect(getForwardedOptions()).toEqual({ network: 'mainnet' });
  });
});
