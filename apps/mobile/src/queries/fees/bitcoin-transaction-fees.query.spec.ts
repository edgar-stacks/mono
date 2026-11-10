import { renderHookWithProviders } from '@/tests/test-utils';
import { waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { type AccountAddresses } from '@leather.io/models';
import { createBitcoinTransactionFeesQueryConfig } from '@leather.io/queries';
import { createMoney } from '@leather.io/utils';

import { useBitcoinTransactionFees } from './bitcoin-transaction-fees.query';

const { mockSettings, mockFees, mockQueryFn } = vi.hoisted(() => {
  const mockFees = { chain: 'bitcoin', options: {} };
  return {
    mockSettings: {
      network: { id: 'mainnet' },
      quoteCurrency: 'USD',
      assetVisibility: {},
      defaultAssetVisibility: {},
    },
    mockFees,
    mockQueryFn: vi.fn(() => Promise.resolve(mockFees)),
  };
});

vi.mock('@leather.io/queries', () => ({
  createBitcoinTransactionFeesQueryConfig: vi.fn(() => ({
    queryKey: ['bitcoin-transaction-fees-service--get-bitcoin-transaction-fees'],
    queryFn: mockQueryFn,
  })),
}));

vi.mock('@/hooks/use-user-settings', () => ({
  useUserSettings: () => mockSettings,
}));

const accountAddresses: AccountAddresses = { id: { fingerprint: 'abcd1234', accountIndex: 0 } };
const account = { account: accountAddresses };
const recipients = [{ address: 'bc1qrecipient', amount: createMoney(1000, 'BTC') }];

describe('useBitcoinTransactionFees', () => {
  it('builds the shared transaction fees query config from the params and user settings', () => {
    renderHookWithProviders(() =>
      useBitcoinTransactionFees({ account, recipients, isMaxSpend: true })
    );

    expect(createBitcoinTransactionFeesQueryConfig).toHaveBeenCalledWith(
      { account, recipients, isMaxSpend: true },
      mockSettings
    );
  });

  it('returns the fee quotes from the service', async () => {
    const { result } = renderHookWithProviders(() =>
      useBitcoinTransactionFees({ account, recipients })
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual(mockFees);
  });

  it('does not fetch when disabled', () => {
    mockQueryFn.mockClear();

    const { result } = renderHookWithProviders(() =>
      useBitcoinTransactionFees({ account, recipients, enabled: false })
    );

    expect(result.current.fetchStatus).toBe('idle');
    expect(mockQueryFn).not.toHaveBeenCalled();
  });
});
