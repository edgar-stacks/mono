import { produce } from 'immer';

import { WalletDefaultNetworkConfigurationIds } from '@leather.io/models';

import { logger } from '@shared/logger';

import { getRecordAtPath } from './legacy-state';

const removedSbtcTestnetId = 'sbtcTestnet';

export function migrateRemovedSbtcTestnetNetwork(state: unknown) {
  logger.info('Beginning removed sBTC Testnet network migration');

  return produce(state, draftState => {
    const networks = getRecordAtPath(draftState, 'networks');
    if (!networks || networks.currentNetworkId !== removedSbtcTestnetId) return;

    const customNetwork = getRecordAtPath(networks, 'entities', removedSbtcTestnetId);
    if (customNetwork) return;

    networks.currentNetworkId = WalletDefaultNetworkConfigurationIds.mainnet;
  });
}
