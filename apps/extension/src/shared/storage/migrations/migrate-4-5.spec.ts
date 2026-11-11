import { describe, expect, test } from 'vitest';

import { defaultNetworksKeyedById } from '@leather.io/models';

import { isRecord } from '@shared/utils/is-record';

import { migrateRemovedSbtcTestnetNetwork } from './migrate-4-5';

function readPath(value: unknown, ...path: string[]): unknown {
  return path.reduce<unknown>((current, key) => {
    if (!isRecord(current)) throw new Error(`Cannot read "${key}" of a non-object value`);
    return current[key];
  }, value);
}

function makeState(currentNetworkId: string, entities: Record<string, unknown> = {}) {
  return {
    networks: { ids: Object.keys(entities), entities, currentNetworkId },
    settings: { userSelectedTheme: 'system' },
  };
}

describe(migrateRemovedSbtcTestnetNetwork.name, () => {
  test('moves a selected sBTC Testnet to mainnet', () => {
    const result = migrateRemovedSbtcTestnetNetwork(makeState('sbtcTestnet'));

    expect(readPath(result, 'networks', 'currentNetworkId')).toEqual('mainnet');
  });

  test('keeps a selected testnet, which now resolves to the Primary Hiro Testnet', () => {
    const result = migrateRemovedSbtcTestnetNetwork(makeState('testnet'));

    expect(readPath(result, 'networks', 'currentNetworkId')).toEqual('testnet');
    expect(defaultNetworksKeyedById.testnet.name).toEqual('Primary Hiro Testnet');
  });

  test('keeps a selected custom network with the sbtcTestnet id', () => {
    const customNetwork = { id: 'sbtcTestnet', name: 'My sBTC network' };

    const result = migrateRemovedSbtcTestnetNetwork(
      makeState('sbtcTestnet', { sbtcTestnet: customNetwork })
    );

    expect(readPath(result, 'networks', 'currentNetworkId')).toEqual('sbtcTestnet');
  });

  test('leaves other selected networks and slices untouched', () => {
    const inputState = makeState('testnet4');

    const result = migrateRemovedSbtcTestnetNetwork(inputState);

    expect(result).toEqual(inputState);
  });

  test('leaves state without a networks slice untouched', () => {
    const inputState = { settings: {} };

    expect(migrateRemovedSbtcTestnetNetwork(inputState)).toEqual(inputState);
  });
});
