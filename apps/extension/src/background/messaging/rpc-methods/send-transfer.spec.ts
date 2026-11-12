import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import { RpcErrorCode } from '@leather.io/rpc';

import { createMockPort } from '../create-mock-port';
import { sendTransferHandler } from './send-transfer';

type SendTransferRequest = Parameters<(typeof sendTransferHandler)[1]>[0];

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

const request: SendTransferRequest = {
  jsonrpc: '2.0',
  id: 'req-1',
  method: 'sendTransfer',
  params: {
    recipients: [{ address: 'bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq', amount: '10000' }],
    network: 'mainnet',
  },
};

function buildPort() {
  return createMockPort({ frameId, url: 'https://app.example.com', tab: { id: tabId } });
}

function buildRequestWithoutParams(): SendTransferRequest {
  const requestWithoutParams: SendTransferRequest = { ...request, id: 'req-2' };
  Reflect.deleteProperty(requestWithoutParams, 'params');
  return requestWithoutParams;
}

function invokeHandler(port: chrome.runtime.Port, sendTransferRequest = request) {
  const [, handler] = sendTransferHandler;
  return handler(sendTransferRequest, port);
}

function getForwardedRequestParams() {
  const [, otherParams] = mocks.createConnectingAppSearchParamsWithLastKnownAccount.mock.calls[0];
  return otherParams;
}

function getForwardedOptions() {
  const [, , options] = mocks.createConnectingAppSearchParamsWithLastKnownAccount.mock.calls[0];
  return options;
}

function objectContaining(expected: Record<string, unknown>): unknown {
  return expect.objectContaining(expected);
}

describe('sendTransferHandler', () => {
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

  test('opens the send-transfer popup for a valid request', async () => {
    await invokeHandler(buildPort());

    expect(mocks.createConnectingAppSearchParamsWithLastKnownAccount).toHaveBeenCalledTimes(1);
    expect(mocks.triggerRequestPopupWindowOpen).toHaveBeenCalledTimes(1);
    expect(mocks.sendErrorResponseOnUserPopupClose).toHaveBeenCalledTimes(1);
  });

  test('rejects undefined parameters', async () => {
    const [, handler] = sendTransferHandler;
    await handler(buildRequestWithoutParams(), buildPort());

    expect(mocks.triggerRequestPopupWindowOpen).not.toHaveBeenCalled();
    expect(mocks.sendMessage).toHaveBeenCalledWith(
      tabId,
      expect.objectContaining({
        error: objectContaining({ code: RpcErrorCode.INVALID_REQUEST }),
      }),
      { frameId }
    );
  });

  test('forwards the requested network to the prefill helper', async () => {
    await invokeHandler(buildPort());

    expect(mocks.validateRequestNetwork).toHaveBeenCalledWith(
      expect.objectContaining({ id: request.id, method: 'sendTransfer', network: 'mainnet' })
    );
    expect(getForwardedOptions()).toEqual({ network: 'mainnet' });
    expect(getForwardedRequestParams().some(([key]) => key === 'network')).toBe(false);
  });

  test('leaves the network to the prefill helper when the request has none', async () => {
    const params = { ...request.params };
    Reflect.deleteProperty(params, 'network');
    await invokeHandler(buildPort(), { ...request, params });

    expect(getForwardedOptions()).toEqual({ network: undefined });
    expect(getForwardedRequestParams().some(([key]) => key === 'network')).toBe(false);
  });

  test('does not open the popup when the network is rejected', async () => {
    mocks.validateRequestNetwork.mockResolvedValue({ status: 'failure' });

    await invokeHandler(buildPort(), {
      ...request,
      params: { ...request.params, network: 'Testnet' },
    });

    expect(mocks.createConnectingAppSearchParamsWithLastKnownAccount).not.toHaveBeenCalled();
    expect(mocks.triggerRequestPopupWindowOpen).not.toHaveBeenCalled();
  });

  test('forwards an explicit account 0', async () => {
    await invokeHandler(buildPort(), { ...request, params: { ...request.params, account: 0 } });

    expect(getForwardedRequestParams()).toContainEqual(['accountIndex', '0']);
  });
});
