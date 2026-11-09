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
  amountMicroStx: 100_000_000n,
  firstRewardCycle: 100,
  numCycles: 12,
  signerManagerContractId: 'SP21YTSM60CAY6D011EZVEVNKXVW8FVZE198XEFFP.fastpool-1-signer-manager',
};

const baseDetails: ActiveStakingDetails = {
  endCycle: 112,
  unlockDate: null,
  isInPreparePhase: false,
  secondsUntilStakingReopens: 0,
  nextCycleNumber: null,
  daysUntilNextCycle: null,
  claimable: { isLoading: false, totalEarned: 0n, byCycle: [] },
  payoutPreference: null,
  payoutPreferenceStatus: 'success',
};

const btcPayoutPreference = { btcRewardAddress, maxFeeSats: 2500n, minClaimSats: 3047n };

function renderGrid(poolSlug: StakingPoolSlug, details: Partial<ActiveStakingDetails>) {
  render(
    <StakingPositionGrid
      poolSlug={poolSlug}
      pool={getStakingPoolFromSlug(poolSlug)}
      info={info}
      details={{ ...baseDetails, ...details }}
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
    renderGrid('fast-pool', { payoutPreference: btcPayoutPreference });
    expect(getCellValue('Rewards token')).toBe('BTC');
    expect(getCellValue('Rewards payout')).toBe(btcRewardAddress);
  });

  test.each(['pending', 'error'] as const)(
    'shows a dash in both cells while the payout read is %s',
    payoutPreferenceStatus => {
      renderGrid('fast-pool', { payoutPreferenceStatus });
      expect(getCellValue('Rewards token')).toBe(EM_DASH);
      expect(getCellValue('Rewards payout')).toBe(EM_DASH);
    }
  );

  test('shows sBTC on Stacks after a successful read finds no BTC preference', () => {
    renderGrid('fast-pool', { payoutPreference: null });
    expect(getCellValue('Rewards token')).toBe('sBTC');
    expect(getCellValue('Rewards payout')).toBe('sBTC on Stacks');
  });

  test('keeps BTC and a dash payout for an operator-paid pool', () => {
    renderGrid('planbetter', { payoutPreference: null });
    expect(getCellValue('Rewards token')).toBe('BTC');
    expect(getCellValue('Rewards payout')).toBe(EM_DASH);
  });
});
