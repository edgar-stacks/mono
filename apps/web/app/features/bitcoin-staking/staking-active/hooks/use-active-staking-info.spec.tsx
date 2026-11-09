import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { getStakingPoolFromSlug } from '~/data/bitcoin-staking-data';

import { type Pox5Position, usePox5Position } from '../../hooks/use-pox5-position';
import { useActiveStakingInfo } from './use-active-staking-info';

interface MockPayoutPreferenceQuery {
  status: string;
  data?: unknown;
}

interface PayoutPreferenceQueryMock {
  current: MockPayoutPreferenceQuery;
  calls: (string | undefined)[];
}

const payoutPreferenceQuery = vi.hoisted(
  (): PayoutPreferenceQueryMock => ({ current: { status: 'pending' }, calls: [] })
);

vi.mock('../../hooks/use-pox5-position', () => ({ usePox5Position: vi.fn() }));

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
  usePox5PayoutPreferenceQuery(signerManagerContractId: string | undefined) {
    payoutPreferenceQuery.calls.push(signerManagerContractId);
    return payoutPreferenceQuery.current;
  },
}));

const btcRewardAddress = '1BvBMSEYstWetqTFn5Au4m4GFg7xJaNVN2';

function makeActivePosition(slug: 'fast-pool' | 'stacking-dao'): Pox5Position {
  return {
    status: 'active',
    info: {
      amountMicroStx: 1_000_000_000n,
      firstRewardCycle: 100,
      numCycles: 12,
      signerManagerContractId: `SP000000000000000000002Q6VF78.${slug}-signer-manager`,
    },
    pool: getStakingPoolFromSlug(slug),
    pendingTx: null,
  };
}

function mockPayoutPreferenceQuery(query: MockPayoutPreferenceQuery) {
  payoutPreferenceQuery.current = query;
}

beforeEach(() => {
  vi.mocked(usePox5Position).mockReturnValue({
    isLoading: false,
    position: makeActivePosition('fast-pool'),
  });
});

describe(useActiveStakingInfo.name, () => {
  test.each(['pending', 'error'] as const)('passes a %s payout read through', status => {
    mockPayoutPreferenceQuery({ status, data: undefined });
    const { result } = renderHook(() => useActiveStakingInfo());
    expect(result.current.details?.payoutPreferenceStatus).toBe(status);
    expect(result.current.details?.payoutPreference).toBeNull();
  });

  test('passes a successful payout read through with its preference', () => {
    mockPayoutPreferenceQuery({
      status: 'success',
      data: { preference: { btcRewardAddress }, supportsMinClaim: true },
    });
    const { result } = renderHook(() => useActiveStakingInfo());
    expect(result.current.details?.payoutPreferenceStatus).toBe('success');
    expect(result.current.details?.payoutPreference).toEqual({ btcRewardAddress });
  });

  test('reports success for a pool that cannot pay in BTC, whose payout read is disabled', () => {
    vi.mocked(usePox5Position).mockReturnValue({
      isLoading: false,
      position: makeActivePosition('stacking-dao'),
    });
    mockPayoutPreferenceQuery({ status: 'pending', data: undefined });
    const { result } = renderHook(() => useActiveStakingInfo());
    expect(payoutPreferenceQuery.calls.at(-1)).toBeUndefined();
    expect(result.current.details?.payoutPreferenceStatus).toBe('success');
  });
});
