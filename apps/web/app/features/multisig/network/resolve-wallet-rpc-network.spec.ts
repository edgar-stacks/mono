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

const privateNetwork: CustomNetworkConfig = {
  bitcoinNetworkMode: 'regtest',
  name: 'BTC Staking Testnet',
  key: 'private-1',
  bitcoinApiUrl: 'https://mempool.bitcoin.private-1.hiro.so/api',
  stacksApiUrl: 'https://api.private-1.hiro.so',
  stacksChainId: 256,
};

afterEach(() => {
  mocks.customNetworkConfig = null;
});

describe('resolveWalletRpcNetwork', () => {
  test('requests mainnet for both mainnet chains', () => {
    expect(resolveWalletRpcNetwork('btc:mainnet')).toBe('mainnet');
    expect(resolveWalletRpcNetwork('stx:mainnet')).toBe('mainnet');
  });

  test('requests testnet3 for bitcoin and testnet for stacks', () => {
    expect(resolveWalletRpcNetwork('btc:testnet')).toBe('testnet3');
    expect(resolveWalletRpcNetwork('stx:testnet')).toBe('testnet');
  });

  test('requests the custom network key when one is configured', () => {
    mocks.customNetworkConfig = privateNetwork;
    expect(resolveWalletRpcNetwork('btc:regtest')).toBe('private-1');
    expect(resolveWalletRpcNetwork('stx:testnet')).toBe('private-1');
  });
});
