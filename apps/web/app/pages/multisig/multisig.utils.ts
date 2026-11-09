import type { AuthNetworkId, CryptoAssetChain } from '@leather.io/models';

import type { Chain } from './data/multisig-types';

export function chainFromNetwork(network: AuthNetworkId): Chain {
  return network.startsWith('btc') ? 'btc' : 'stx';
}

export function cryptoAssetChainFromNetwork(network: AuthNetworkId): CryptoAssetChain {
  return chainFromNetwork(network) === 'btc' ? 'bitcoin' : 'stacks';
}
