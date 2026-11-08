import { afterEach, describe, expect, test, vi } from 'vitest';
import type { CustomNetworkConfig } from '~/constants/custom-network-config';

import { resolveWalletRpcNetwork } from './resolve-wallet-rpc-network';

interface CustomNetworkConfigMocks {
  customNetworkConfig: CustomNetworkConfig | null;
}

const mocks = vi.hoisted((): CustomNetworkConfigMocks => ({ customNetworkConfig: null }));

vi.mock('~/constants/custom-network-config', () => ({
  get customNetworkConfig() {
    return mocks.customNetworkConfig;
  },
}));

afterEach(() => {
  mocks.customNetworkConfig = null;
});

describe(resolveWalletRpcNetwork.name, () => {
  test('requests mainnet for mainnet vaults', () => {
    expect(resolveWalletRpcNetwork('btc:mainnet')).toBe('mainnet');
    expect(resolveWalletRpcNetwork('stx:mainnet')).toBe('mainnet');
  });

  test('requests testnet3 for Bitcoin and testnet for Stacks testnet vaults', () => {
    expect(resolveWalletRpcNetwork('btc:testnet')).toBe('testnet3');
    expect(resolveWalletRpcNetwork('stx:testnet')).toBe('testnet');
  });

  test('requests the custom network key when one is configured', () => {
    mocks.customNetworkConfig = {
      bitcoinNetworkMode: 'regtest',
      name: 'Private',
      key: 'private',
      bitcoinApiUrl: 'https://mempool.example/api',
      stacksApiUrl: 'https://stacks.example',
      stacksChainId: undefined,
    };
    expect(resolveWalletRpcNetwork('btc:testnet')).toBe('private');
    expect(resolveWalletRpcNetwork('stx:testnet')).toBe('private');
  });
});
