import { renderHookWithProviders } from '@/tests/test-utils';
import { waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { type AccountAddresses } from '@leather.io/models';
import { createBitcoinTransactionFeesQueryConfig } from '@leather.io/queries';
import { createMoney } from '@leather.io/utils';

import { useBitcoinTransactionFees } from './bitcoin-transaction-fees.query';

const { queryFn, settings } = vi.hoisted(() => ({
  queryFn: vi.fn(() => Promise.resolve({ chain: 'bitcoin', options: {} })),
  settings: { network: { id: 'mainnet' }, quoteCurrency: 'USD', assetVisibility: {} },
}));

vi.mock('@leather.io/queries', () => ({
  createBitcoinTransactionFeesQueryConfig: vi.fn(() => ({
    queryKey: ['bitcoin-transaction-fees'],
    queryFn,
  })),
}));

vi.mock('@/hooks/use-user-settings', () => ({
  useUserSettings: () => settings,
}));

const account: AccountAddresses = {
  id: { fingerprint: 'abcd1234', accountIndex: 0 },
};
const recipients = [{ address: 'bc1qrecipient', amount: createMoney(1000, 'BTC') }];

describe(useBitcoinTransactionFees.name, () => {
  it('builds the shared query config from the account, recipients and max spend flag', async () => {
    const { result } = renderHookWithProviders(() =>
      useBitcoinTransactionFees({ account: { account }, recipients, isMaxSpend: true })
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual({ chain: 'bitcoin', options: {} });
    expect(createBitcoinTransactionFeesQueryConfig).toHaveBeenCalledWith(
      { account: { account }, recipients, isMaxSpend: true },
      settings
    );
  });

  it('does not fetch when disabled', () => {
    queryFn.mockClear();
    const { result } = renderHookWithProviders(() =>
      useBitcoinTransactionFees({ account: { account }, recipients, enabled: false })
    );

    expect(result.current.fetchStatus).toBe('idle');
    expect(queryFn).not.toHaveBeenCalled();
  });
});
