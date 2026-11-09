import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { type StakingPoolSlug, getStakingPoolFromSlug } from '~/data/bitcoin-staking-data';

import { type Pox5PayoutPreferenceResult } from '../../queries/create-get-pox5-payout-preference-query-options';
import { type ActiveStakingDetails, useActiveStakingInfo } from './use-active-staking-info';

type PayoutPreferenceStatus = ActiveStakingDetails['payoutPreferenceStatus'];

interface PayoutPreferenceQueryState {
  status: PayoutPreferenceStatus;
  data: Pox5PayoutPreferenceResult | null | undefined;
}

interface TestState {
  poolSlug: StakingPoolSlug;
  payoutPreferenceQuery: PayoutPreferenceQueryState;
  payoutPreferenceQueryArgs: (string | undefined)[];
}

const testState = vi.hoisted(
  (): TestState => ({
    poolSlug: 'fast-pool',
    payoutPreferenceQuery: { status: 'pending', data: undefined },
    payoutPreferenceQueryArgs: [],
  })
);

const signerManagerContractId = 'SP21YTSM60CAY6D011EZVEVNKXVW8FVZE198XEFFP.signer-manager';

vi.mock('../../hooks/use-pox5-position', () => ({
  usePox5Position() {
    return {
      isLoading: false,
      position: {
        status: 'active',
        info: {
          amountMicroStx: 1_000_000_000n,
          firstRewardCycle: 100,
          numCycles: 12,
          signerManagerContractId,
        },
        pool: getStakingPoolFromSlug(testState.poolSlug),
        pendingTx: null,
      },
    };
  },
}));
vi.mock('../../hooks/use-pox5-cycle-clock', () => ({
  usePox5CycleClock() {
    return { cycleClock: null };
  },
}));
vi.mock('../../queries/pox5-node.query', () => ({
  usePox5PoxInfoQuery() {
    return { data: undefined };
  },
  usePox5SecondsUntilNextCycleQuery() {
    return { data: undefined };
  },
}));
vi.mock('../../queries/pox5-stacking.query', () => ({
  usePox5ClaimableRewards() {
    return { isLoading: false, totalEarned: 0n, byCycle: [] };
  },
  usePox5PayoutPreferenceQuery(contractId: string | undefined) {
    testState.payoutPreferenceQueryArgs.push(contractId);
    return testState.payoutPreferenceQuery;
  },
}));

const btcPayoutPreference = {
  btcRewardAddress: '1BvBMSEYstWetqTFn5Au4m4GFg7xJaNVN2',
  maxFeeSats: 2_500n,
  minClaimSats: 5_000n,
};

beforeEach(() => {
  testState.poolSlug = 'fast-pool';
  testState.payoutPreferenceQuery = { status: 'pending', data: undefined };
  testState.payoutPreferenceQueryArgs = [];
});

describe(useActiveStakingInfo.name, () => {
  test.each<PayoutPreferenceStatus>(['pending', 'error'])(
    'passes a %s payout read through without a preference',
    status => {
      testState.payoutPreferenceQuery = { status, data: undefined };
      const { result } = renderHook(() => useActiveStakingInfo());
      expect(result.current.details?.payoutPreferenceStatus).toBe(status);
      expect(result.current.details?.payoutPreference).toBeNull();
    }
  );

  test('passes a successful payout read through with its preference', () => {
    testState.payoutPreferenceQuery = {
      status: 'success',
      data: { preference: btcPayoutPreference, supportsMinClaim: true },
    };
    const { result } = renderHook(() => useActiveStakingInfo());
    expect(result.current.details?.payoutPreferenceStatus).toBe('success');
    expect(result.current.details?.payoutPreference).toEqual(btcPayoutPreference);
    expect(testState.payoutPreferenceQueryArgs).toContain(signerManagerContractId);
  });

  test('reports success for a pool that cannot pay in BTC, whose payout read is disabled', () => {
    testState.poolSlug = 'stacking-dao';
    const { result } = renderHook(() => useActiveStakingInfo());
    expect(testState.payoutPreferenceQueryArgs).toEqual([undefined]);
    expect(result.current.details?.payoutPreferenceStatus).toBe('success');
    expect(result.current.details?.payoutPreference).toBeNull();
  });
});
