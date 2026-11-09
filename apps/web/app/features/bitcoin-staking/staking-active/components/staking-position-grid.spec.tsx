import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, test, vi } from 'vitest';
import { EM_DASH } from '~/constants/constants';
import { type StakingPoolSlug, getStakingPoolFromSlug } from '~/data/bitcoin-staking-data';

import { type Pox5PayoutPreference } from '../../transactions/pox5-signer-calldata';
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

const unloadedStatuses: ActiveStakingDetails['payoutPreferenceStatus'][] = ['pending', 'error'];

const btcRewardAddress = '1BvBMSEYstWetqTFn5Au4m4GFg7xJaNVN2';
const btcPayoutPreference: Pox5PayoutPreference = {
  btcRewardAddress,
  maxFeeSats: 2_500n,
  minClaimSats: 5_000n,
};

const info = {
  amountMicroStx: 1_000_000_000n,
  firstRewardCycle: 100,
  numCycles: 12,
  signerManagerContractId: 'SP21YTSM60CAY6D011EZVEVNKXVW8FVZE198XEFFP.fast-pool-signer-manager',
};

function makeDetails(
  payoutPreference: Pox5PayoutPreference | null,
  payoutPreferenceStatus: ActiveStakingDetails['payoutPreferenceStatus']
): ActiveStakingDetails {
  return {
    endCycle: 112,
    unlockDate: null,
    isInPreparePhase: false,
    secondsUntilStakingReopens: 0,
    nextCycleNumber: null,
    daysUntilNextCycle: null,
    claimable: { isLoading: false, totalEarned: 0n, byCycle: [] },
    payoutPreference,
    payoutPreferenceStatus,
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
  return screen.getByRole('heading', { name }).nextElementSibling?.textContent;
}

afterEach(() => {
  cleanup();
});

describe(StakingPositionGrid.name, () => {
  test('shows BTC and the payout address for a Fast Pool BTC election', () => {
    renderGrid('fast-pool', makeDetails(btcPayoutPreference, 'success'));
    expect(getCellValue('Rewards token')).toBe('BTC');
    expect(getCellValue('Rewards payout')).toContain(btcRewardAddress);
  });

  test.each(unloadedStatuses)(
    'shows nothing in either cell while the payout read is %s',
    status => {
      renderGrid('fast-pool', makeDetails(null, status));
      expect(getCellValue('Rewards token')).toBe(EM_DASH);
      expect(getCellValue('Rewards payout')).toBe(EM_DASH);
    }
  );

  test('shows sBTC on Stacks once a read confirms there is no BTC election', () => {
    renderGrid('fast-pool', makeDetails(null, 'success'));
    expect(getCellValue('Rewards token')).toBe('sBTC');
    expect(getCellValue('Rewards payout')).toBe('sBTC on Stacks');
  });

  test('shows BTC without a payout for an operator-paid pool', () => {
    renderGrid('planbetter', makeDetails(null, 'success'));
    expect(getCellValue('Rewards token')).toBe('BTC');
    expect(getCellValue('Rewards payout')).toBe(EM_DASH);
  });
});
