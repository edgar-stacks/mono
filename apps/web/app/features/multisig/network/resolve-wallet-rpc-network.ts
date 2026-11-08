import { customNetworkConfig } from '~/constants/custom-network-config';

import { type AuthNetworkId, WalletDefaultNetworkConfigurationIds } from '@leather.io/models';

export function resolveWalletRpcNetwork(network: AuthNetworkId): string {
  if (network.endsWith('mainnet')) return WalletDefaultNetworkConfigurationIds.mainnet;
  if (customNetworkConfig) return customNetworkConfig.key;
  return network.startsWith('btc')
    ? WalletDefaultNetworkConfigurationIds.testnet3
    : WalletDefaultNetworkConfigurationIds.primaryStacksTestnet;
}
