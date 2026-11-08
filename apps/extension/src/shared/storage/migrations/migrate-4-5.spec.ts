import { describe, expect, test } from 'vitest';

import { isRecord } from '@shared/utils/is-record';

import { migrateToPrimaryHiroTestnet } from './migrate-4-5';

function readPath(value: unknown, ...path: string[]): unknown {
  return path.reduce<unknown>((current, key) => {
    if (!isRecord(current)) throw new Error(`Cannot read "${key}" of a non-object value`);
    return current[key];
  }, value);
}

function makeState(currentNetworkId: string) {
  return {
    networks: { ids: [], entities: {}, currentNetworkId },
    settings: { userSelectedTheme: 'system' },
  };
}

describe(migrateToPrimaryHiroTestnet.name, () => {
  test('keeps a Testnet3 selection on the testnet id, which is now Primary Hiro Testnet', () => {
    const result = migrateToPrimaryHiroTestnet(makeState('testnet'));
    expect(readPath(result, 'networks', 'currentNetworkId')).toEqual('testnet');
  });

  test('moves an sBTC Testnet selection to mainnet', () => {
    const result = migrateToPrimaryHiroTestnet(makeState('sbtcTestnet'));
    expect(readPath(result, 'networks', 'currentNetworkId')).toEqual('mainnet');
  });

  test('moves a legacy BTC Staking Testnet selection to mainnet', () => {
    const result = migrateToPrimaryHiroTestnet(makeState('private-1'));
    expect(readPath(result, 'networks', 'currentNetworkId')).toEqual('mainnet');
  });

  test('moves a BTC Staking Testnet selection to its renamed id', () => {
    const result = migrateToPrimaryHiroTestnet(makeState('stakingTestnet'));
    expect(readPath(result, 'networks', 'currentNetworkId')).toEqual('btcStakingStacksTestnet');
  });

  test('leaves other selections and custom networks untouched', () => {
    const inputState = {
      networks: {
        ids: ['my-network'],
        entities: { 'my-network': { id: 'my-network', name: 'My network' } },
        currentNetworkId: 'my-network',
      },
    };
    expect(migrateToPrimaryHiroTestnet(inputState)).toEqual(inputState);
    expect(
      readPath(migrateToPrimaryHiroTestnet(makeState('testnet4')), 'networks', 'currentNetworkId')
    ).toEqual('testnet4');
  });

  test('tolerates state without a networks slice', () => {
    expect(migrateToPrimaryHiroTestnet({ settings: {} })).toEqual({ settings: {} });
    expect(migrateToPrimaryHiroTestnet(undefined)).toBeUndefined();
  });
});
