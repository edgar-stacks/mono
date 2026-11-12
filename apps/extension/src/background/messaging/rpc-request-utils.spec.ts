import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import { RpcErrorCode, type RpcRequests } from '@leather.io/rpc';

import { createMockPort } from './create-mock-port';
import {
  createConnectingAppSearchParamsWithLastKnownAccount,
  validateConnectedWalletExists,
  validateRequestNetwork,
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
const fingerprint = 'abcd1234';
const frameId = 42;
const tabId = 7;
const request: RpcRequests = { jsonrpc: '2.0', id: 'req-1', method: 'supportedMethods' };

function buildPort(tabUrl?: string) {
  return createMockPort({ frameId, url: `https://${hostname}`, tab: { id: tabId, url: tabUrl } });
}

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
    origin: hostname,
    fingerprint,
    accountIndex: 0,
    requestedAccounts: '2024-01-01T00:00:00.000Z',
    networkMode: 'mainnet',
    ...overrides,
  };
}

function buildState({
  permission,
  walletFingerprints,
  policies = {},
  networks = {},
}: {
  permission?: Record<string, unknown>;
  walletFingerprints: string[];
  policies?: Record<string, unknown>;
  networks?: Record<string, unknown>;
}) {
  return {
    appPermissions: { entities: permission ? { [hostname]: permission } : {} },
    wallets: { entities: buildWalletEntities(walletFingerprints) },
    policy: { entities: policies },
    networks: { entities: networks },
  };
}

describe('popup request metadata', () => {
  beforeEach(() => {
    mocks.getRootState.mockResolvedValue(buildState({ walletFingerprints: [] }));
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  test('preserves the originating frame in popup request metadata', async () => {
    const result = await createConnectingAppSearchParamsWithLastKnownAccount(buildPort());

    expect(result.frameId).toBe(frameId);
    expect(result.tabId).toBe(tabId);
    expect(result.urlParams.get('frameId')).toBe(frameId.toString());
    expect(result.urlParams.get('tabId')).toBe(tabId.toString());
  });

  test('sets the frame origin and the top-level tab origin', async () => {
    const result = await createConnectingAppSearchParamsWithLastKnownAccount(
      buildPort('https://top.example.com/some/page')
    );

    expect(result.urlParams.get('origin')).toBe(`https://${hostname}`);
    expect(result.urlParams.get('topOrigin')).toBe('https://top.example.com');
  });

  test('omits the top origin when the sender tab has no url', async () => {
    const result = await createConnectingAppSearchParamsWithLastKnownAccount(buildPort());

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

  test('pins nothing when the origin has no permission', async () => {
    mocks.getRootState.mockResolvedValue(buildState({ walletFingerprints: [] }));

    const result = await createConnectingAppSearchParamsWithLastKnownAccount(buildPort());

    expect(result.urlParams.get('accountIndex')).toBeNull();
    expect(result.urlParams.get('fingerprint')).toBeNull();
    expect(result.urlParams.get('policyId')).toBeNull();
  });

  test('skips a stored binding without an accountIndex', async () => {
    const permission = buildPermission({ policyId: `${fingerprint}/0/bc1qaddr/mainnet` });
    Reflect.deleteProperty(permission, 'accountIndex');
    mocks.getRootState.mockResolvedValue(buildState({ permission, walletFingerprints: [] }));

    const result = await createConnectingAppSearchParamsWithLastKnownAccount(buildPort());

    expect(result.urlParams.get('accountIndex')).toBeNull();
    expect(result.urlParams.get('fingerprint')).toBeNull();
    expect(result.urlParams.get('policyId')).toBeNull();
  });

  test.each([null, '1', 1.5, Number.NaN])(
    'skips a stored binding whose accountIndex is %s',
    async accountIndex => {
      mocks.getRootState.mockResolvedValue(
        buildState({ permission: buildPermission({ accountIndex }), walletFingerprints: [] })
      );

      const result = await createConnectingAppSearchParamsWithLastKnownAccount(buildPort());

      expect(result.urlParams.get('accountIndex')).toBeNull();
      expect(result.urlParams.get('fingerprint')).toBeNull();
    }
  );

  test('keeps the request-scoped account when the stored binding is invalid', async () => {
    mocks.getRootState.mockResolvedValue(
      buildState({ permission: buildPermission({ accountIndex: '1' }), walletFingerprints: [] })
    );

    const result = await createConnectingAppSearchParamsWithLastKnownAccount(buildPort(), [
      ['accountIndex', '2'],
    ]);

    expect(result.urlParams.get('accountIndex')).toBe('2');
    expect(result.urlParams.get('fingerprint')).toBeNull();
  });

  test('defaults the network to mainnet when the request has none', async () => {
    mocks.getRootState.mockResolvedValue(
      buildState({ permission: buildPermission(), walletFingerprints: [] })
    );

    const result = await createConnectingAppSearchParamsWithLastKnownAccount(buildPort());

    expect(result.urlParams.get('network')).toBe('mainnet');
  });

  test('defaults the network to mainnet when the origin has no permission', async () => {
    mocks.getRootState.mockResolvedValue(buildState({ walletFingerprints: [] }));

    const result = await createConnectingAppSearchParamsWithLastKnownAccount(buildPort());

    expect(result.urlParams.get('network')).toBe('mainnet');
  });

  test('defaults the network to the bound policy network', async () => {
    const policyId = `${fingerprint}/0/tb1qaddr/testnet4`;
    mocks.getRootState.mockResolvedValue(
      buildState({
        permission: buildPermission({ policyId }),
        walletFingerprints: [],
        policies: { [policyId]: { id: policyId, networkId: 'testnet4' } },
      })
    );

    const result = await createConnectingAppSearchParamsWithLastKnownAccount(buildPort());

    expect(result.urlParams.get('network')).toBe('testnet4');
  });

  test('uses an explicit network over the bound policy network', async () => {
    const policyId = `${fingerprint}/0/tb1qaddr/testnet4`;
    mocks.getRootState.mockResolvedValue(
      buildState({
        permission: buildPermission({ policyId }),
        walletFingerprints: [],
        policies: { [policyId]: { id: policyId, networkId: 'testnet4' } },
      })
    );

    const result = await createConnectingAppSearchParamsWithLastKnownAccount(buildPort(), [], {
      network: 'signet',
    });

    expect(result.urlParams.get('network')).toBe('signet');
    expect(result.urlParams.getAll('network')).toHaveLength(1);
  });

  test('defaults the network to mainnet when the bound policy no longer exists', async () => {
    mocks.getRootState.mockResolvedValue(
      buildState({
        permission: buildPermission({ policyId: `${fingerprint}/0/tb1qaddr/testnet4` }),
        walletFingerprints: [],
      })
    );

    const result = await createConnectingAppSearchParamsWithLastKnownAccount(buildPort());

    expect(result.urlParams.get('network')).toBe('mainnet');
  });
});

describe(validateRequestNetwork.name, () => {
  const customNetworkId = 'my-devnet';

  beforeEach(() => {
    vi.stubGlobal('chrome', { tabs: { sendMessage: mocks.sendMessage } });
    mocks.getRootState.mockResolvedValue(
      buildState({
        walletFingerprints: [],
        networks: { [customNetworkId]: { id: customNetworkId } },
      })
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  function validate(network: string | undefined) {
    return validateRequestNetwork({
      id: 'req-1',
      method: 'getAddresses',
      network,
      port: buildPort(),
    });
  }

  test('accepts a request without a network', async () => {
    expect(await validate(undefined)).toEqual({ status: 'success' });
    expect(mocks.sendMessage).not.toHaveBeenCalled();
  });

  test.each([
    'mainnet',
    'testnet',
    'testnet4',
    'signet',
    'sbtcTestnet',
    'sbtcDevenv',
    'devnet',
    'private-1',
    'stakingTestnet',
  ])('accepts the default network %s', async network => {
    expect(await validate(network)).toEqual({ status: 'success' });
    expect(mocks.sendMessage).not.toHaveBeenCalled();
  });

  test('accepts the id of a custom network', async () => {
    expect(await validate(customNetworkId)).toEqual({ status: 'success' });
    expect(mocks.sendMessage).not.toHaveBeenCalled();
  });

  test.each(['unknown', 'Testnet', '', '  '])(
    'rejects the unknown network "%s" with INVALID_PARAMS',
    async network => {
      expect(await validate(network)).toEqual({ status: 'failure' });
      expect(mocks.sendMessage).toHaveBeenCalledWith(
        tabId,
        expect.objectContaining({
          id: 'req-1',
          error: objectContaining({
            code: RpcErrorCode.INVALID_PARAMS,
            message: expect.stringContaining(`Unknown network: '${network}'`),
          }),
        }),
        { frameId }
      );
      expect(mocks.trackRpcRequestError).toHaveBeenCalledWith({
        endpoint: 'getAddresses',
        error: 'Unknown network',
      });
    }
  );
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

  test('fails with UNAUTHENTICATED when the permission has no accountIndex', async () => {
    const permission = buildPermission();
    Reflect.deleteProperty(permission, 'accountIndex');
    mocks.getRootState.mockResolvedValue(
      buildState({ permission, walletFingerprints: [fingerprint] })
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
      appPermissions: { entities: { [hostname]: buildPermission() } },
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
