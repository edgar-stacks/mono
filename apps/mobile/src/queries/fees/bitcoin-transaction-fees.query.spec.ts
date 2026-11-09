import { renderHookWithProviders } from '@/tests/test-utils';
import { waitFor } from '@testing-library/react';
import { describe, expect, test, vi } from 'vitest';

import { type AccountAddresses } from '@leather.io/models';
import { createBitcoinTransactionFeesQueryConfig } from '@leather.io/queries';
import { createMoney } from '@leather.io/utils';

import { useBitcoinTransactionFees } from './bitcoin-transaction-fees.query';

const settings = { network: { id: 'mainnet' }, quoteCurrency: 'USD', assetVisibility: {} };
const transactionFees = { chain: 'bitcoin', options: {} };
const queryFn = vi.fn(() => Promise.resolve(transactionFees));

vi.mock('@/hooks/use-user-settings', () => ({
  useUserSettings: () => settings,
}));

vi.mock('@leather.io/queries', () => ({
  createBitcoinTransactionFeesQueryConfig: vi.fn(() => ({
    queryKey: ['bitcoin-transaction-fees'],
    queryFn,
  })),
}));

const account: AccountAddresses = { id: { fingerprint: 'abcd1234', accountIndex: 0 } };
const recipients = [{ address: 'bc1qrecipient', amount: createMoney(1000, 'BTC') }];

describe(useBitcoinTransactionFees.name, () => {
  test('returns the fee quotes from the shared transaction fees query', async () => {
    const { result } = renderHookWithProviders(() =>
      useBitcoinTransactionFees({ account: { account }, recipients, isMaxSpend: true })
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(transactionFees);
    expect(createBitcoinTransactionFeesQueryConfig).toHaveBeenCalledWith(
      { account: { account }, recipients, isMaxSpend: true },
      settings
    );
  });

  test('does not fetch when disabled', () => {
    queryFn.mockClear();
    const { result } = renderHookWithProviders(() =>
      useBitcoinTransactionFees({ account: { account }, recipients, enabled: false })
    );

    expect(result.current.fetchStatus).toEqual('idle');
    expect(queryFn).not.toHaveBeenCalled();
  });
});
