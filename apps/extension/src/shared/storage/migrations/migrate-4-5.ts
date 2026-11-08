import { produce } from 'immer';

import { WalletDefaultNetworkConfigurationIds } from '@leather.io/models';
import { isString } from '@leather.io/utils';

import { logger } from '@shared/logger';
import { isRecord } from '@shared/utils/is-record';

import { type LegacyRecord, asUnknownArray, getRecordAtPath } from './legacy-state';

const removedNetworkIds = ['sbtcTestnet', 'private-1'];

const renamedNetworkIds: Record<string, string> = {
  stakingTestnet: WalletDefaultNetworkConfigurationIds.btcStakingStacksTestnet,
};

function migrateCurrentNetworkId(networkId: string) {
  if (removedNetworkIds.includes(networkId)) return WalletDefaultNetworkConfigurationIds.mainnet;
  return renamedNetworkIds[networkId] ?? networkId;
}

function migratePolicyNetworkId(chain: unknown, networkId: string) {
  if (
    chain === 'bitcoin' &&
    networkId === WalletDefaultNetworkConfigurationIds.primaryStacksTestnet
  )
    return WalletDefaultNetworkConfigurationIds.testnet3;
  return renamedNetworkIds[networkId] ?? networkId;
}

function migratePolicies(draftState: LegacyRecord) {
  const policyNetworkIds = new Map<string, string>();
  const migratedPolicyIds = new Map<string, string>();

  const policy = getRecordAtPath(draftState, 'policy');
  const policyEntities = getRecordAtPath(policy, 'entities');
  if (!policy || !policyEntities) return { policyNetworkIds, migratedPolicyIds };

  const ids: string[] = [];
  const entities: Record<string, unknown> = {};
  for (const id of asUnknownArray(policy.ids)?.filter(isString) ?? []) {
    const entity = getRecordAtPath(policyEntities, id);
    if (
      !entity ||
      !isString(entity.networkId) ||
      !isString(entity.parentAccountId) ||
      !isString(entity.address)
    ) {
      ids.push(id);
      entities[id] = policyEntities[id];
      continue;
    }
    const networkId = migratePolicyNetworkId(entity.chain, entity.networkId);
    const migratedId = `${entity.parentAccountId}/${entity.address}/${networkId}`;
    ids.push(migratedId);
    entities[migratedId] = { ...entity, id: migratedId, networkId };
    policyNetworkIds.set(migratedId, networkId);
    if (migratedId !== id) migratedPolicyIds.set(id, migratedId);
  }
  policy.ids = ids;
  policy.entities = entities;

  return { policyNetworkIds, migratedPolicyIds };
}

function migratePolicyAccounts(draftState: LegacyRecord, migratedPolicyIds: Map<string, string>) {
  const accounts = getRecordAtPath(draftState, 'accounts');
  const accountEntities = getRecordAtPath(accounts, 'entities');
  if (!accounts || !accountEntities || migratedPolicyIds.size === 0) return;

  const ids: string[] = [];
  const entities: Record<string, unknown> = {};
  for (const id of asUnknownArray(accounts.ids)?.filter(isString) ?? []) {
    const migratedId = migratedPolicyIds.get(id) ?? id;
    const entity = getRecordAtPath(accountEntities, id);
    ids.push(migratedId);
    entities[migratedId] = entity ? { ...entity, id: migratedId } : accountEntities[id];
  }
  accounts.ids = ids;
  accounts.entities = entities;
}

function migrateActivePolicyId(
  draftState: LegacyRecord,
  currentNetworkId: unknown,
  policyNetworkIds: Map<string, string>,
  migratedPolicyIds: Map<string, string>
) {
  const active = getRecordAtPath(draftState, 'active');
  if (!active || !isString(active.activePolicyId)) return;

  const activePolicyId = migratedPolicyIds.get(active.activePolicyId) ?? active.activePolicyId;
  const activePolicyNetworkId = policyNetworkIds.get(activePolicyId);
  active.activePolicyId =
    activePolicyNetworkId && activePolicyNetworkId === currentNetworkId ? activePolicyId : null;
}

export function migrateToPrimaryStacksTestnet(state: unknown) {
  logger.info('Beginning primary stacks testnet migration');

  return produce(state, draftState => {
    if (!isRecord(draftState)) return;

    const networks = getRecordAtPath(draftState, 'networks');
    if (networks && isString(networks.currentNetworkId)) {
      networks.currentNetworkId = migrateCurrentNetworkId(networks.currentNetworkId);
    }
    const currentNetworkId = networks?.currentNetworkId;

    const { policyNetworkIds, migratedPolicyIds } = migratePolicies(draftState);
    migratePolicyAccounts(draftState, migratedPolicyIds);
    migrateActivePolicyId(draftState, currentNetworkId, policyNetworkIds, migratedPolicyIds);
  });
}
