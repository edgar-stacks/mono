import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, test, vi } from 'vitest';
import { EM_DASH } from '~/constants/constants';
import { type StakingPoolSlug, getStakingPoolFromSlug } from '~/data/bitcoin-staking-data';

import { type ActiveStakingDetails } from '../hooks/use-active-staking-info';
import { StakingPositionGrid } from './staking-position-grid';

vi.mock('./staking-action-buttons', () => ({
  StakingActionButtons() {
    return null;
  },
}));

vi.mock('../../components/pool-tvl-value', () => ({
  PoolTvlValue() {
    return null;
  },
}));

const btcRewardAddress = '1BvBMSEYstWetqTFn5Au4m4GFg7xJaNVN2';

const info = {
  amountMicroStx: 1_000_000_000n,
  firstRewardCycle: 100,
  numCycles: 12,
  signerManagerContractId:
    'SPMPMA1V6P430M8C91QS1G9XJ95S59JS1TZFZ4Q4.fastpool-max500-signer-manager',
};

function makeDetails(overrides: Partial<ActiveStakingDetails>): ActiveStakingDetails {
  return {
    endCycle: 112,
    unlockDate: null,
    isInPreparePhase: false,
    secondsUntilStakingReopens: 0,
    nextCycleNumber: null,
    daysUntilNextCycle: null,
    claimable: { isLoading: false, totalEarned: 0n, byCycle: [] },
    payoutPreference: null,
    payoutPreferenceStatus: 'success',
    ...overrides,
  };
}

function renderGrid(poolSlug: StakingPoolSlug, details: ActiveStakingDetails) {
  render(
    <StakingPositionGrid
      poolSlug={poolSlug}
      pool={getStakingPoolFromSlug(poolSlug)}
      info={info}
      details={details}
    />
  );
}

function getCellValue(name: string) {
  return screen.getByText(name).nextElementSibling?.textContent;
}

afterEach(() => {
  cleanup();
});

describe(StakingPositionGrid.name, () => {
  test('shows BTC and the payout address for a Fast Pool BTC election', () => {
    renderGrid(
      'fast-pool',
      makeDetails({ payoutPreference: { btcRewardAddress, maxFeeSats: 2500n } })
    );
    expect(getCellValue('Rewards token')).toBe('BTC');
    expect(getCellValue('Rewards payout')).toContain(btcRewardAddress);
  });

  test.each(['pending', 'error'] as const)(
    'shows a dash in both cells while the payout read is %s',
    payoutPreferenceStatus => {
      renderGrid('fast-pool', makeDetails({ payoutPreferenceStatus }));
      expect(getCellValue('Rewards token')).toBe(EM_DASH);
      expect(getCellValue('Rewards payout')).toBe(EM_DASH);
    }
  );

  test('shows sBTC on Stacks once a successful read finds no BTC election', () => {
    renderGrid('fast-pool', makeDetails({ payoutPreference: null }));
    expect(getCellValue('Rewards token')).toBe('sBTC');
    expect(getCellValue('Rewards payout')).toBe('sBTC on Stacks');
  });

  test('shows BTC with no payout address for an operator-paid pool', () => {
    renderGrid('planbetter', makeDetails({ payoutPreference: null }));
    expect(getCellValue('Rewards token')).toBe('BTC');
    expect(getCellValue('Rewards payout')).toBe(EM_DASH);
  });
});
