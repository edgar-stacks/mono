import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { type StakingPoolSlug, getStakingPoolFromSlug } from '~/data/bitcoin-staking-data';

import { useActiveStakingInfo } from './use-active-staking-info';

const mocks = vi.hoisted(() => ({
  usePox5Position: vi.fn(),
  usePox5PayoutPreferenceQuery: vi.fn(),
}));

vi.mock('../../hooks/use-pox5-position', () => ({
  usePox5Position: mocks.usePox5Position,
}));

vi.mock('../../hooks/use-pox5-cycle-clock', () => ({
  usePox5CycleClock() {
    return { isLoading: false, cycleClock: null };
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
  usePox5PayoutPreferenceQuery: mocks.usePox5PayoutPreferenceQuery,
}));

const signerManagerContractId =
  'SP21YTSM60CAY6D011EZVEVNKXVW8FVZE198XEFFP.fastpool-1-signer-manager';

function mockActivePosition(poolSlug: StakingPoolSlug) {
  mocks.usePox5Position.mockReturnValue({
    isLoading: false,
    position: {
      status: 'active',
      info: {
        amountMicroStx: 1_000_000_000n,
        firstRewardCycle: 100,
        numCycles: 12,
        signerManagerContractId,
      },
      pool: getStakingPoolFromSlug(poolSlug),
      pendingTx: null,
    },
  });
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe(useActiveStakingInfo.name, () => {
  test.each([
    { status: 'pending', data: undefined },
    { status: 'error', data: undefined },
    { status: 'success', data: { preference: null, supportsMinClaim: true } },
  ])('passes through a $status payout preference read', ({ status, data }) => {
    mockActivePosition('fast-pool');
    mocks.usePox5PayoutPreferenceQuery.mockReturnValue({ status, data });
    const { result } = renderHook(() => useActiveStakingInfo());
    expect(mocks.usePox5PayoutPreferenceQuery).toHaveBeenCalledWith(signerManagerContractId);
    expect(result.current.details?.payoutPreferenceStatus).toBe(status);
    expect(result.current.details?.payoutPreference).toBeNull();
  });

  test('reports a loaded BTC payout preference', () => {
    const preference = {
      btcRewardAddress: '1BvBMSEYstWetqTFn5Au4m4GFg7xJaNVN2',
      maxFeeSats: 2500n,
    };
    mockActivePosition('fast-pool');
    mocks.usePox5PayoutPreferenceQuery.mockReturnValue({
      status: 'success',
      data: { preference, supportsMinClaim: true },
    });
    const { result } = renderHook(() => useActiveStakingInfo());
    expect(result.current.details?.payoutPreferenceStatus).toBe('success');
    expect(result.current.details?.payoutPreference).toEqual(preference);
  });

  test('reports success for a pool that cannot pay in BTC, whose payout read is disabled', () => {
    mockActivePosition('stacking-dao');
    mocks.usePox5PayoutPreferenceQuery.mockReturnValue({ status: 'pending', data: undefined });
    const { result } = renderHook(() => useActiveStakingInfo());
    expect(mocks.usePox5PayoutPreferenceQuery).toHaveBeenCalledWith(undefined);
    expect(result.current.details?.payoutPreferenceStatus).toBe('success');
    expect(result.current.details?.payoutPreference).toBeNull();
  });
});
