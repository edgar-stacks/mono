import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import { RpcErrorCode } from '@leather.io/rpc';

import { createMockPort } from '../create-mock-port';
import { stxSignMessageHandler, stxSignStructuredMessageHandler } from './sign-stacks-message';

type StxSignMessageRequest = Parameters<(typeof stxSignMessageHandler)[1]>[0];
type StxSignStructuredMessageRequest = Parameters<(typeof stxSignStructuredMessageHandler)[1]>[0];

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
  getOriginFromPort: (port: chrome.runtime.Port) =>
    port.sender?.url ? new URL(port.sender.url).origin : port.sender?.origin,
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
const requestingOrigin = 'https://app.example.com';

function signInMessage(domain: string) {
  return `Sign in to Leather\nDomain: ${domain}\nApplication: multisig\nNetwork: mainnet\nIssued: 1780651887`;
}

function makeRequest(params: StxSignMessageRequest['params']): StxSignMessageRequest {
  return {
    jsonrpc: '2.0',
    id: 'req-1',
    method: 'stx_signMessage',
    params,
  };
}

function buildPort() {
  return createMockPort({ frameId, url: requestingOrigin, tab: { id: tabId } });
}

function invokeHandler(request: StxSignMessageRequest) {
  const [, handler] = stxSignMessageHandler;
  return handler(request, buildPort());
}

function objectContaining(expected: Record<string, unknown>): unknown {
  return expect.objectContaining(expected);
}

describe('stxSignMessageHandler', () => {
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

  test('refuses a sign-in message naming a different origin before opening the popup', async () => {
    await invokeHandler(
      makeRequest({ message: signInMessage('https://app.leather.io'), messageType: 'utf8' })
    );

    expect(mocks.sendMessage).toHaveBeenCalledWith(
      tabId,
      expect.objectContaining({
        error: objectContaining({ code: RpcErrorCode.PERMISSION_DENIED }),
      }),
      { frameId }
    );
    expect(mocks.triggerRequestPopupWindowOpen).not.toHaveBeenCalled();
  });

  test('opens the popup for a sign-in message naming the requesting origin', async () => {
    await invokeHandler(
      makeRequest({ message: signInMessage(requestingOrigin), messageType: 'utf8' })
    );

    expect(mocks.sendMessage).not.toHaveBeenCalled();
    expect(mocks.triggerRequestPopupWindowOpen).toHaveBeenCalled();
    expect(mocks.sendErrorResponseOnUserPopupClose).toHaveBeenCalled();
  });

  test('forwards the requested network to the shared resolution', async () => {
    await invokeHandler(makeRequest({ message: 'hello', messageType: 'utf8', network: 'testnet' }));

    const [, otherParams, options] =
      mocks.createConnectingAppSearchParamsWithLastKnownAccount.mock.calls[0];
    expect(options).toEqual({ network: 'testnet' });
    expect(new URLSearchParams(otherParams).has('network')).toBe(false);
  });

  test('rejects an unknown network without opening the popup', async () => {
    mocks.validateRequestNetwork.mockResolvedValue({ status: 'failure' });

    await invokeHandler(makeRequest({ message: 'hello', messageType: 'utf8', network: 'Testnet' }));

    expect(mocks.triggerRequestPopupWindowOpen).not.toHaveBeenCalled();
  });
});

describe('stxSignStructuredMessageHandler', () => {
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

  function invokeStructuredHandler(network?: string) {
    const [, handler] = stxSignStructuredMessageHandler;
    const request: StxSignStructuredMessageRequest = {
      jsonrpc: '2.0',
      id: 'req-2',
      method: 'stx_signStructuredMessage',
      params: { domain: '0c', message: '0c', network },
    };
    return handler(request, buildPort());
  }

  test('validates and forwards the requested network', async () => {
    await invokeStructuredHandler('testnet');

    expect(mocks.validateRequestNetwork).toHaveBeenCalledWith(
      expect.objectContaining({ method: 'stx_signStructuredMessage', network: 'testnet' })
    );
    const [, , options] = mocks.createConnectingAppSearchParamsWithLastKnownAccount.mock.calls[0];
    expect(options).toEqual({ network: 'testnet' });
  });

  test('rejects an unknown network without opening the popup', async () => {
    mocks.validateRequestNetwork.mockResolvedValue({ status: 'failure' });

    await invokeStructuredHandler('unknown');

    expect(mocks.triggerRequestPopupWindowOpen).not.toHaveBeenCalled();
  });
});
