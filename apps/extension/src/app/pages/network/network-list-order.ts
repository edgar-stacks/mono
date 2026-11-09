import { WalletDefaultNetworkConfigurationIds } from '@leather.io/models';

const defaultNetworkListOrder: string[] = [
  WalletDefaultNetworkConfigurationIds.mainnet,
  WalletDefaultNetworkConfigurationIds.testnet,
  WalletDefaultNetworkConfigurationIds.stakingTestnet,
  WalletDefaultNetworkConfigurationIds.signet,
  WalletDefaultNetworkConfigurationIds['private-1'],
  WalletDefaultNetworkConfigurationIds.testnet4,
  WalletDefaultNetworkConfigurationIds.testnet3,
  WalletDefaultNetworkConfigurationIds.sbtcDevenv,
  WalletDefaultNetworkConfigurationIds.devnet,
];

export function sortNetworkListIds(networkIds: string[]) {
  const defaultIds = defaultNetworkListOrder.filter(id => networkIds.includes(id));
  const otherIds = networkIds.filter(id => !defaultNetworkListOrder.includes(id));
  return [...defaultIds, ...otherIds];
}
