import { renderHookWithProviders } from '@/tests/test-utils';
import { waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { createBitcoinFeeRatesQueryConfig } from '@leather.io/queries';

import { useBitcoinFeeRates } from './bitcoin-fee-rates.query';

const { mockSettings } = vi.hoisted(() => ({
  mockSettings: {
    network: { id: 'mainnet' },
    quoteCurrency: 'USD',
    assetVisibility: {},
    defaultAssetVisibility: {},
  },
}));

vi.mock('@leather.io/queries', () => ({
  createBitcoinFeeRatesQueryConfig: vi.fn(() => ({
    queryKey: ['leather-api--bitcoin-fee-rates'],
    queryFn: () =>
      Promise.resolve({
        low: { rate: 2 },
        standard: { rate: 5 },
        high: { rate: 9 },
      }),
  })),
}));

vi.mock('@/hooks/use-user-settings', () => ({
  useUserSettings: () => mockSettings,
}));

describe('useBitcoinFeeRates', () => {
  it('builds the shared fee rates query config from the user settings', () => {
    renderHookWithProviders(() => useBitcoinFeeRates());

    expect(createBitcoinFeeRatesQueryConfig).toHaveBeenCalledWith(mockSettings);
  });

  it('returns the low, standard and high tier rates', async () => {
    const { result } = renderHookWithProviders(() => useBitcoinFeeRates());

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual({
      low: { rate: 2 },
      standard: { rate: 5 },
      high: { rate: 9 },
    });
  });
});
