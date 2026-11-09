import { defaultNetworksKeyedById } from '@leather.io/models';

import { resolveCurrentNetworkId } from './networks.utils';

describe(resolveCurrentNetworkId.name, () => {
  it('keeps a current network that still exists', () => {
    expect(resolveCurrentNetworkId(defaultNetworksKeyedById, 'testnet')).toBe('testnet');
  });

  it('falls back to mainnet for the removed sBTC Testnet', () => {
    expect(resolveCurrentNetworkId(defaultNetworksKeyedById, 'sbtcTestnet')).toBe('mainnet');
  });
});
