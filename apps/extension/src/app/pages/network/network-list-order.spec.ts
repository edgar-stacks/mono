import { type NetworkConfiguration, defaultNetworksKeyedById } from '@leather.io/models';

import { sortNetworkListIds } from './network-list-order';

const networks: Record<string, NetworkConfiguration> = defaultNetworksKeyedById;

describe(sortNetworkListIds.name, () => {
  it('orders the default networks for the network list', () => {
    const names = sortNetworkListIds(Object.keys(networks)).map(id => networks[id]?.name);
    expect(names).toEqual([
      'Mainnet',
      'Primary Hiro Testnet',
      'BTC Staking Testnet',
      'Signet',
      'BTC Staking Testnet (Legacy)',
      'Testnet4',
      'Testnet3',
      'sBTC Devenv',
      'Devnet',
    ]);
  });

  it('lists custom networks after the default networks in their original order', () => {
    expect(sortNetworkListIds(['custom-b', 'devnet', 'custom-a', 'mainnet'])).toEqual([
      'mainnet',
      'devnet',
      'custom-b',
      'custom-a',
    ]);
  });
});
