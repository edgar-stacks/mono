import { renderHookWithProviders } from '@/tests/test-utils';
import { waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { type BitcoinTransactionFees, defaultNetworksKeyedById } from '@leather.io/models';
import type { AccountRequest, UserSettings } from '@leather.io/services';
import { createMoney } from '@leather.io/utils';

import { useBitcoinTransactionFees } from './bitcoin-transaction-fees.query';

const mocks = vi.hoisted(() => ({
  createBitcoinTransactionFeesQueryConfig: vi.fn(),
  queryFn: vi.fn(),
}));

const settings: UserSettings = {
  network: defaultNetworksKeyedById.mainnet,
  quoteCurrency: 'USD',
  assetVisibility: {},
};

vi.mock('@/hooks/use-user-settings', () => ({
  useUserSettings: () => settings,
}));

vi.mock('@leather.io/queries', () => ({
  createBitcoinTransactionFeesQueryConfig: mocks.createBitcoinTransactionFeesQueryConfig,
}));

function createQuote(fee: number, rate: number) {
  return {
    type: 'bitcoinFeeRate',
    value: createMoney(fee, 'BTC'),
    rate,
    rateUnit: 'sats/vB',
    estimatedTxSize: 140,
    sizeUnit: 'vB',
  } as const;
}

const fees: BitcoinTransactionFees = {
  chain: 'bitcoin',
  options: {
    low: createQuote(280, 2),
    standard: createQuote(700, 5),
    high: createQuote(1260, 9),
  },
};

const account: AccountRequest = {
  account: { id: { fingerprint: 'abcd1234', accountIndex: 0 } },
};
const recipients = [{ address: 'bc1qrecipient', amount: createMoney(1000, 'BTC') }];

describe(useBitcoinTransactionFees.name, () => {
  beforeEach(() => {
    mocks.queryFn.mockReset();
    mocks.queryFn.mockResolvedValue(fees);
    mocks.createBitcoinTransactionFeesQueryConfig.mockReturnValue({
      queryKey: ['bitcoin-transaction-fees'],
      queryFn: mocks.queryFn,
    });
  });

  it('returns the quotes from the shared transaction fees query', async () => {
    const { result } = renderHookWithProviders(() =>
      useBitcoinTransactionFees({ account, recipients, isMaxSpend: true })
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mocks.createBitcoinTransactionFeesQueryConfig).toHaveBeenCalledWith(
      { account, recipients, isMaxSpend: true },
      settings
    );
    expect(result.current.data).toEqual(fees);
  });

  it('does not fetch when disabled', () => {
    const { result } = renderHookWithProviders(() =>
      useBitcoinTransactionFees({ account, recipients, enabled: false })
    );

    expect(result.current.fetchStatus).toBe('idle');
    expect(mocks.queryFn).not.toHaveBeenCalled();
  });
});
