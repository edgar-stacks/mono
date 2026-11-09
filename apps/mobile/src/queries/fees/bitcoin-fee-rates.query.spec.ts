import { renderHookWithProviders } from '@/tests/test-utils';
import { waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { defaultNetworksKeyedById } from '@leather.io/models';
import type { UserSettings } from '@leather.io/services';

import { useBitcoinFeeRates } from './bitcoin-fee-rates.query';

const mocks = vi.hoisted(() => ({
  createBitcoinFeeRatesQueryConfig: vi.fn(),
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
  createBitcoinFeeRatesQueryConfig: mocks.createBitcoinFeeRatesQueryConfig,
}));

describe(useBitcoinFeeRates.name, () => {
  it('returns the tiered rates from the shared fee rates query', async () => {
    mocks.createBitcoinFeeRatesQueryConfig.mockReturnValue({
      queryKey: ['bitcoin-fee-rates'],
      queryFn: () =>
        Promise.resolve({
          low: { rate: 2, time: 60 },
          standard: { rate: 5, time: 30 },
          high: { rate: 9, time: 10 },
        }),
    });

    const { result } = renderHookWithProviders(() => useBitcoinFeeRates());

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mocks.createBitcoinFeeRatesQueryConfig).toHaveBeenCalledWith(settings);
    expect(result.current.data).toEqual({
      low: { rate: 2 },
      standard: { rate: 5 },
      high: { rate: 9 },
    });
  });
});
