import { produce } from 'immer';

import { WalletDefaultNetworkConfigurationIds } from '@leather.io/models';
import { isString } from '@leather.io/utils';

import { logger } from '@shared/logger';

import { getRecordAtPath } from './legacy-state';

const removedNetworkIdReplacements: Record<string, string> = {
  sbtcTestnet: WalletDefaultNetworkConfigurationIds.mainnet,
  'private-1': WalletDefaultNetworkConfigurationIds.mainnet,
  stakingTestnet: WalletDefaultNetworkConfigurationIds.btcStakingStacksTestnet,
};

export function migrateToPrimaryHiroTestnet(state: unknown) {
  logger.info('Beginning primary hiro testnet migration');

  return produce(state, draftState => {
    const networks = getRecordAtPath(draftState, 'networks');
    if (!networks || !isString(networks.currentNetworkId)) return;

    const replacementNetworkId = removedNetworkIdReplacements[networks.currentNetworkId];
    if (replacementNetworkId) networks.currentNetworkId = replacementNetworkId;
  });
}
