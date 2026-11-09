import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { type StakingPoolSlug, getStakingPoolFromSlug } from '~/data/bitcoin-staking-data';

import { useActiveStakingInfo } from './use-active-staking-info';

const mocks = vi.hoisted(() => ({
  position: {},
  payoutPreferenceQuery: vi.fn(),
}));

vi.mock('../../hooks/use-pox5-position', () => ({
  usePox5Position() {
    return { isLoading: false, position: mocks.position };
  },
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
  usePox5PayoutPreferenceQuery: mocks.payoutPreferenceQuery,
}));

const signerManagerContractId =
  'SP21YTSM60CAY6D011EZVEVNKXVW8FVZE198XEFFP.fastpool-1-signer-manager';

function stakeIn(poolSlug: StakingPoolSlug) {
  mocks.position = {
    status: 'active',
    info: {
      amountMicroStx: 100_000_000n,
      firstRewardCycle: 100,
      numCycles: 12,
      signerManagerContractId,
    },
    pool: getStakingPoolFromSlug(poolSlug),
    pendingTx: null,
  };
}

beforeEach(() => {
  mocks.payoutPreferenceQuery.mockReset();
});

describe(useActiveStakingInfo.name, () => {
  test.each(['pending', 'error', 'success'] as const)(
    'passes through a %s payout preference read',
    status => {
      stakeIn('fast-pool');
      mocks.payoutPreferenceQuery.mockReturnValue({ status, data: undefined });
      const { result } = renderHook(() => useActiveStakingInfo());
      expect(mocks.payoutPreferenceQuery).toHaveBeenCalledWith(signerManagerContractId);
      expect(result.current.details?.payoutPreferenceStatus).toBe(status);
    }
  );

  test('reports success for a pool that cannot pay in BTC, whose read is disabled', () => {
    stakeIn('stacking-dao');
    mocks.payoutPreferenceQuery.mockReturnValue({ status: 'pending', data: undefined });
    const { result } = renderHook(() => useActiveStakingInfo());
    expect(mocks.payoutPreferenceQuery).toHaveBeenCalledWith(undefined);
    expect(result.current.details?.payoutPreferenceStatus).toBe('success');
    expect(result.current.details?.payoutPreference).toBeNull();
  });
});
