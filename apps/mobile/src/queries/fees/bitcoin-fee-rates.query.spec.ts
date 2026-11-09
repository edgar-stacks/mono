import { renderHookWithProviders } from '@/tests/test-utils';
import { waitFor } from '@testing-library/react';
import { describe, expect, test, vi } from 'vitest';

import { createBitcoinFeeRatesQueryConfig } from '@leather.io/queries';

import { useBitcoinFeeRates } from './bitcoin-fee-rates.query';

const settings = { network: { id: 'mainnet' }, quoteCurrency: 'USD', assetVisibility: {} };

vi.mock('@/hooks/use-user-settings', () => ({
  useUserSettings: () => settings,
}));

vi.mock('@leather.io/queries', () => ({
  createBitcoinFeeRatesQueryConfig: vi.fn(() => ({
    queryKey: ['bitcoin-fee-rates'],
    queryFn: () =>
      Promise.resolve({
        low: { rate: 2, extra: 'ignored' },
        standard: { rate: 5, extra: 'ignored' },
        high: { rate: 9, extra: 'ignored' },
      }),
  })),
}));

describe(useBitcoinFeeRates.name, () => {
  test('returns the tiered rates from the shared fee rates query', async () => {
    const { result } = renderHookWithProviders(() => useBitcoinFeeRates());

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual({
      low: { rate: 2 },
      standard: { rate: 5 },
      high: { rate: 9 },
    });
  });

  test('builds the query config from the user settings', () => {
    renderHookWithProviders(() => useBitcoinFeeRates());

    expect(createBitcoinFeeRatesQueryConfig).toHaveBeenCalledWith(settings);
  });
});
