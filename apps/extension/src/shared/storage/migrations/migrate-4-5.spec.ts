import { describe, expect, test } from 'vitest';

import { migrateToPrimaryStacksTestnet } from './migrate-4-5';

const parentAccountId = 'a1b2c3d4/0';

function makePolicy(chain: 'bitcoin' | 'stacks', address: string, networkId: string) {
  return {
    id: `${parentAccountId}/${address}/${networkId}`,
    parentAccountId,
    networkId,
    address,
    role: 'signer',
    chain,
  };
}

function makeState(currentNetworkId: string, policies: ReturnType<typeof makePolicy>[] = []) {
  return {
    networks: { ids: [], entities: {}, currentNetworkId },
    policy: {
      ids: policies.map(policy => policy.id),
      entities: Object.fromEntries(policies.map(policy => [policy.id, policy])),
    },
  };
}

describe(migrateToPrimaryStacksTestnet.name, () => {
  test('keeps a Testnet3 selection on the testnet id, now Primary Hiro Testnet', () => {
    expect(migrateToPrimaryStacksTestnet(makeState('testnet'))).toMatchObject({
      networks: { currentNetworkId: 'testnet' },
    });
  });

  test('moves an sBTC Testnet selection to mainnet', () => {
    expect(migrateToPrimaryStacksTestnet(makeState('sbtcTestnet'))).toMatchObject({
      networks: { currentNetworkId: 'mainnet' },
    });
  });

  test('moves a BTC Staking Testnet (Legacy) selection to mainnet', () => {
    expect(migrateToPrimaryStacksTestnet(makeState('private-1'))).toMatchObject({
      networks: { currentNetworkId: 'mainnet' },
    });
  });

  test('renames a BTC Staking Testnet selection', () => {
    expect(migrateToPrimaryStacksTestnet(makeState('stakingTestnet'))).toMatchObject({
      networks: { currentNetworkId: 'btcStakingStacksTestnet' },
    });
  });

  test('leaves other selections untouched', () => {
    expect(migrateToPrimaryStacksTestnet(makeState('custom-network'))).toMatchObject({
      networks: { currentNetworkId: 'custom-network' },
    });
  });

  test('keeps Bitcoin testnet policies on Testnet3 and Stacks testnet policies on testnet', () => {
    const bitcoinPolicy = makePolicy('bitcoin', 'tb1qvault', 'testnet');
    const stacksPolicy = makePolicy('stacks', 'SN1VAULT', 'testnet');

    const result = migrateToPrimaryStacksTestnet(
      makeState('mainnet', [bitcoinPolicy, stacksPolicy])
    );

    const migratedBitcoinId = `${parentAccountId}/tb1qvault/testnet3`;
    expect(result).toEqual(
      makeState('mainnet', [
        { ...bitcoinPolicy, id: migratedBitcoinId, networkId: 'testnet3' },
        stacksPolicy,
      ])
    );
  });

  test('renames policies on BTC Staking Testnet', () => {
    const policy = makePolicy('stacks', 'SN1VAULT', 'stakingTestnet');

    const result = migrateToPrimaryStacksTestnet(makeState('mainnet', [policy]));

    expect(result).toEqual(
      makeState('mainnet', [
        {
          ...policy,
          id: `${parentAccountId}/SN1VAULT/btcStakingStacksTestnet`,
          networkId: 'btcStakingStacksTestnet',
        },
      ])
    );
  });

  test('re-keys the name and hidden status of a migrated policy', () => {
    const bitcoinPolicy = makePolicy('bitcoin', 'tb1qvault', 'testnet');
    const stacksPolicy = makePolicy('stacks', 'SN1VAULT', 'stakingTestnet');
    const accountId = parentAccountId;
    const state = {
      ...makeState('mainnet', [bitcoinPolicy, stacksPolicy]),
      accounts: {
        ids: [accountId, bitcoinPolicy.id, stacksPolicy.id],
        entities: {
          [accountId]: { id: accountId, name: 'Main' },
          [bitcoinPolicy.id]: { id: bitcoinPolicy.id, name: 'Treasury', status: 'hidden' },
          [stacksPolicy.id]: { id: stacksPolicy.id, name: 'Staking', status: 'active' },
        },
      },
    };

    const migratedBitcoinId = `${parentAccountId}/tb1qvault/testnet3`;
    const migratedStacksId = `${parentAccountId}/SN1VAULT/btcStakingStacksTestnet`;
    expect(migrateToPrimaryStacksTestnet(state)).toMatchObject({
      accounts: {
        ids: [accountId, migratedBitcoinId, migratedStacksId],
        entities: {
          [accountId]: { id: accountId, name: 'Main' },
          [migratedBitcoinId]: { id: migratedBitcoinId, name: 'Treasury', status: 'hidden' },
          [migratedStacksId]: { id: migratedStacksId, name: 'Staking', status: 'active' },
        },
      },
    });
  });

  test('re-keys an active policy that stays on the current network', () => {
    const policy = makePolicy('stacks', 'SN1VAULT', 'stakingTestnet');
    const state = {
      ...makeState('stakingTestnet', [policy]),
      active: { account: null, activePolicyId: policy.id },
    };

    expect(migrateToPrimaryStacksTestnet(state)).toMatchObject({
      active: { activePolicyId: `${parentAccountId}/SN1VAULT/btcStakingStacksTestnet` },
    });
  });

  test('keeps an active Stacks policy on testnet', () => {
    const policy = makePolicy('stacks', 'SN1VAULT', 'testnet');
    const state = {
      ...makeState('testnet', [policy]),
      active: { account: null, activePolicyId: policy.id },
    };

    expect(migrateToPrimaryStacksTestnet(state)).toMatchObject({
      active: { activePolicyId: policy.id },
    });
  });

  test('clears the active policy when the current network is removed', () => {
    const policy = makePolicy('bitcoin', 'bcrt1qvault', 'private-1');
    const state = {
      ...makeState('private-1', [policy]),
      active: { account: null, activePolicyId: policy.id },
    };

    expect(migrateToPrimaryStacksTestnet(state)).toMatchObject({
      networks: { currentNetworkId: 'mainnet' },
      active: { activePolicyId: null },
    });
  });

  test('clears an active Bitcoin policy that moves to Testnet3 off the current network', () => {
    const policy = makePolicy('bitcoin', 'tb1qvault', 'testnet');
    const state = {
      ...makeState('testnet', [policy]),
      active: { account: null, activePolicyId: policy.id },
    };

    expect(migrateToPrimaryStacksTestnet(state)).toMatchObject({
      networks: { currentNetworkId: 'testnet' },
      active: { activePolicyId: null },
    });
  });

  test('passes through a state without network or policy slices', () => {
    expect(migrateToPrimaryStacksTestnet({ settings: {} })).toEqual({ settings: {} });
  });
});
