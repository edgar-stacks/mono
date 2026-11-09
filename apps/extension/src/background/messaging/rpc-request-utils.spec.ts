import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import { RpcErrorCode, type RpcRequests } from '@leather.io/rpc';

import { createMockPort } from './create-mock-port';
import {
  createConnectingAppMetadataSearchParams,
  createConnectingAppSearchParamsWithLastKnownAccount,
  validateConnectedWalletExists,
} from './rpc-request-utils';

const mocks = vi.hoisted(() => ({
  getRootState: vi.fn(),
  sendMissingStateErrorToTab: vi.fn(),
  sendMessage: vi.fn(),
  trackRpcRequestError: vi.fn(),
}));

vi.mock('@shared/storage/get-root-state', () => ({
  getRootState: mocks.getRootState,
  sendMissingStateErrorToTab: mocks.sendMissingStateErrorToTab,
}));

vi.mock('./rpc-helpers', () => ({
  trackRpcRequestError: mocks.trackRpcRequestError,
}));

const hostname = 'app.example.com';
const origin = `https://${hostname}`;
const fingerprint = 'abcd1234';
const frameId = 42;
const tabId = 7;
const request: RpcRequests = { jsonrpc: '2.0', id: 'req-1', method: 'supportedMethods' };

function buildPort(tabUrl?: string) {
  return createMockPort({ frameId, url: origin, tab: { id: tabId, url: tabUrl } });
}

function buildPortFromSender(sender: { origin?: string; url?: string }) {
  return createMockPort({ frameId, ...sender, tab: { id: tabId } });
}

const otherOriginPorts: [string, chrome.runtime.Port][] = [
  ['a different scheme', buildPortFromSender({ url: `http://${hostname}/page` })],
  ['a different port', buildPortFromSender({ url: `https://${hostname}:8443/page` })],
  ['a null sender origin', buildPortFromSender({ origin: 'null', url: `${origin}/page` })],
];

function objectContaining(expected: Record<string, unknown>): unknown {
  return expect.objectContaining(expected);
}

function buildWalletEntities(fingerprints: string[]) {
  const entities: Record<string, unknown> = {};
  for (const value of fingerprints)
    entities[value] = { fingerprint: value, type: 'software', name: 'Wallet', createdOn: null };
  return entities;
}

function buildPermission(overrides: Record<string, unknown> = {}) {
  return {
    origin,
    fingerprint,
    accountIndex: 0,
    requestedAccounts: '2024-01-01T00:00:00.000Z',
    networkMode: 'mainnet',
    ...overrides,
  };
}

function buildState({
  permission,
  permissionKey = origin,
  walletFingerprints,
}: {
  permission?: Record<string, unknown>;
  permissionKey?: string;
  walletFingerprints: string[];
}) {
  return {
    appPermissions: { entities: permission ? { [permissionKey]: permission } : {} },
    wallets: { entities: buildWalletEntities(walletFingerprints) },
  };
}

describe(createConnectingAppMetadataSearchParams.name, () => {
  test('preserves the originating frame in popup request metadata', () => {
    const result = createConnectingAppMetadataSearchParams(buildPort());

    expect(result.frameId).toBe(frameId);
    expect(result.tabId).toBe(tabId);
    expect(result.urlParams.get('frameId')).toBe(frameId.toString());
    expect(result.urlParams.get('tabId')).toBe(tabId.toString());
  });

  test('sets the frame origin and the top-level tab origin', () => {
    const result = createConnectingAppMetadataSearchParams(
      buildPort('https://top.example.com/some/page')
    );

    expect(result.urlParams.get('origin')).toBe(origin);
    expect(result.urlParams.get('topOrigin')).toBe('https://top.example.com');
  });

  test('prefers the browser-set sender origin over the sender url', () => {
    const result = createConnectingAppMetadataSearchParams(
      buildPortFromSender({ origin, url: 'https://other.example.com/page' })
    );

    expect(result.urlParams.get('origin')).toBe(origin);
  });

  test('omits the origin when the sender origin is opaque', () => {
    const result = createConnectingAppMetadataSearchParams(
      buildPortFromSender({ origin: 'null', url: `${origin}/page` })
    );

    expect(result.origin).toBeUndefined();
    expect(result.urlParams.get('origin')).toBeNull();
  });

  test('omits the top origin when the sender tab has no url', () => {
    const result = createConnectingAppMetadataSearchParams(buildPort());

    expect(result.urlParams.get('topOrigin')).toBeNull();
  });
});

describe(createConnectingAppSearchParamsWithLastKnownAccount.name, () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  test('pins the last known account from the origin permission', async () => {
    mocks.getRootState.mockResolvedValue(
      buildState({ permission: buildPermission({ accountIndex: 3 }), walletFingerprints: [] })
    );

    const result = await createConnectingAppSearchParamsWithLastKnownAccount(buildPort());

    expect(result.urlParams.get('accountIndex')).toBe('3');
    expect(result.urlParams.get('fingerprint')).toBe(fingerprint);
    expect(result.urlParams.get('policyId')).toBeNull();
  });

  test('pins the bound policy from the origin permission', async () => {
    const policyId = `${fingerprint}/0/bc1qaddr/mainnet`;
    mocks.getRootState.mockResolvedValue(
      buildState({ permission: buildPermission({ policyId }), walletFingerprints: [] })
    );

    const result = await createConnectingAppSearchParamsWithLastKnownAccount(buildPort());

    expect(result.urlParams.get('accountIndex')).toBe('0');
    expect(result.urlParams.get('fingerprint')).toBe(fingerprint);
    expect(result.urlParams.get('policyId')).toBe(policyId);
  });

  test('keeps a request-scoped account and suppresses the policy binding', async () => {
    const policyId = `${fingerprint}/0/bc1qaddr/mainnet`;
    mocks.getRootState.mockResolvedValue(
      buildState({ permission: buildPermission({ policyId }), walletFingerprints: [] })
    );

    const result = await createConnectingAppSearchParamsWithLastKnownAccount(buildPort(), [
      ['accountIndex', '2'],
    ]);

    expect(result.urlParams.get('accountIndex')).toBe('2');
    expect(result.urlParams.get('fingerprint')).toBe(fingerprint);
    expect(result.urlParams.get('policyId')).toBeNull();
  });

  test.each(otherOriginPorts)('pins nothing for %s', async (_, port) => {
    mocks.getRootState.mockResolvedValue(
      buildState({ permission: buildPermission(), walletFingerprints: [fingerprint] })
    );

    const result = await createConnectingAppSearchParamsWithLastKnownAccount(port);

    expect(result.urlParams.get('accountIndex')).toBeNull();
    expect(result.urlParams.get('fingerprint')).toBeNull();
    expect(result.urlParams.get('policyId')).toBeNull();
  });

  test('pins nothing from a legacy permission keyed by hostname', async () => {
    mocks.getRootState.mockResolvedValue(
      buildState({
        permission: buildPermission({ origin: hostname }),
        permissionKey: hostname,
        walletFingerprints: [fingerprint],
      })
    );

    const result = await createConnectingAppSearchParamsWithLastKnownAccount(buildPort());

    expect(result.urlParams.get('accountIndex')).toBeNull();
    expect(result.urlParams.get('fingerprint')).toBeNull();
  });

  test('pins nothing when the origin has no permission', async () => {
    mocks.getRootState.mockResolvedValue(buildState({ walletFingerprints: [] }));

    const result = await createConnectingAppSearchParamsWithLastKnownAccount(buildPort());

    expect(result.urlParams.get('accountIndex')).toBeNull();
    expect(result.urlParams.get('fingerprint')).toBeNull();
    expect(result.urlParams.get('policyId')).toBeNull();
  });
});

describe('validateConnectedWalletExists', () => {
  beforeEach(() => {
    vi.stubGlobal('chrome', { tabs: { sendMessage: mocks.sendMessage } });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  test('succeeds when the connected wallet still exists', async () => {
    mocks.getRootState.mockResolvedValue(
      buildState({ permission: buildPermission(), walletFingerprints: [fingerprint] })
    );

    const result = await validateConnectedWalletExists(request, buildPort());

    expect(result).toEqual({ status: 'success' });
    expect(mocks.sendMessage).not.toHaveBeenCalled();
    expect(mocks.sendMissingStateErrorToTab).not.toHaveBeenCalled();
  });

  test('fails with UNAUTHENTICATED when the pinned wallet was removed', async () => {
    mocks.getRootState.mockResolvedValue(
      buildState({ permission: buildPermission(), walletFingerprints: [] })
    );

    const result = await validateConnectedWalletExists(request, buildPort());

    expect(result).toEqual({ status: 'failure' });
    expect(mocks.sendMessage).toHaveBeenCalledWith(
      tabId,
      expect.objectContaining({
        id: request.id,
        error: objectContaining({ code: RpcErrorCode.UNAUTHENTICATED }),
      }),
      { frameId }
    );
  });

  test('fails with UNAUTHENTICATED when no permission exists for the origin', async () => {
    mocks.getRootState.mockResolvedValue(buildState({ walletFingerprints: [fingerprint] }));

    const result = await validateConnectedWalletExists(request, buildPort());

    expect(result).toEqual({ status: 'failure' });
    expect(mocks.sendMessage).toHaveBeenCalledWith(
      tabId,
      expect.objectContaining({
        error: objectContaining({ code: RpcErrorCode.UNAUTHENTICATED }),
      }),
      { frameId }
    );
  });

  test.each(otherOriginPorts)('fails with UNAUTHENTICATED for %s', async (_, port) => {
    mocks.getRootState.mockResolvedValue(
      buildState({ permission: buildPermission(), walletFingerprints: [fingerprint] })
    );

    const result = await validateConnectedWalletExists(request, port);

    expect(result).toEqual({ status: 'failure' });
    expect(mocks.sendMessage).toHaveBeenCalledWith(
      tabId,
      expect.objectContaining({
        error: objectContaining({ code: RpcErrorCode.UNAUTHENTICATED }),
      }),
      { frameId }
    );
  });

  test('fails with UNAUTHENTICATED for a legacy permission keyed by hostname', async () => {
    mocks.getRootState.mockResolvedValue(
      buildState({
        permission: buildPermission({ origin: hostname }),
        permissionKey: hostname,
        walletFingerprints: [fingerprint],
      })
    );

    const result = await validateConnectedWalletExists(request, buildPort());

    expect(result).toEqual({ status: 'failure' });
    expect(mocks.sendMessage).toHaveBeenCalledWith(
      tabId,
      expect.objectContaining({
        error: objectContaining({ code: RpcErrorCode.UNAUTHENTICATED }),
      }),
      { frameId }
    );
  });

  test('fails when the permission has never been granted account access', async () => {
    mocks.getRootState.mockResolvedValue(
      buildState({
        permission: buildPermission({ requestedAccounts: undefined }),
        walletFingerprints: [fingerprint],
      })
    );

    const result = await validateConnectedWalletExists(request, buildPort());

    expect(result).toEqual({ status: 'failure' });
    expect(mocks.sendMessage).toHaveBeenCalledTimes(1);
  });

  test('fails and reports missing state when the wallet is not initialized', async () => {
    mocks.getRootState.mockResolvedValue(null);

    const result = await validateConnectedWalletExists(request, buildPort());

    expect(result).toEqual({ status: 'failure' });
    expect(mocks.sendMissingStateErrorToTab).toHaveBeenCalledWith({
      frameId,
      tabId,
      method: request.method,
      id: request.id,
    });
    expect(mocks.sendMessage).not.toHaveBeenCalled();
  });

  test('fails and reports missing state when persisted state predates multiwallet support', async () => {
    mocks.getRootState.mockResolvedValue({
      appPermissions: { entities: { [origin]: buildPermission() } },
    });

    const result = await validateConnectedWalletExists(request, buildPort());

    expect(result).toEqual({ status: 'failure' });
    expect(mocks.sendMissingStateErrorToTab).toHaveBeenCalledWith({
      frameId,
      tabId,
      method: request.method,
      id: request.id,
    });
    expect(mocks.sendMessage).not.toHaveBeenCalled();
  });

  test('forwards a custom error message into the rejection', async () => {
    const errorMessage = 'Permission denied, user must first connect to the wallet';
    mocks.getRootState.mockResolvedValue(
      buildState({ permission: buildPermission(), walletFingerprints: [] })
    );

    await validateConnectedWalletExists(request, buildPort(), errorMessage);

    expect(mocks.sendMessage).toHaveBeenCalledWith(
      tabId,
      expect.objectContaining({ error: objectContaining({ message: errorMessage }) }),
      { frameId }
    );
  });
});
