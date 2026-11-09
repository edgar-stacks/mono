import type { AuthNetworkId, CryptoAssetChain } from '@leather.io/models';

import type { Chain } from './data/multisig-types';

export function chainFromNetwork(network: AuthNetworkId): Chain {
  return network.startsWith('btc') ? 'btc' : 'stx';
}

export function assetChainFromNetwork(network: AuthNetworkId): CryptoAssetChain {
  return network.startsWith('btc') ? 'bitcoin' : 'stacks';
}
