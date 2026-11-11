import { renderHookWithProviders } from '@/tests/test-utils';
import { waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { createBitcoinFeeRatesQueryConfig } from '@leather.io/queries';

import { useBitcoinFeeRates } from './bitcoin-fee-rates.query';

const { feeRates, settings } = vi.hoisted(() => ({
  feeRates: { low: { rate: 2 }, standard: { rate: 5 }, high: { rate: 10 } },
  settings: { network: { id: 'mainnet' }, quoteCurrency: 'USD', assetVisibility: {} },
}));

vi.mock('@leather.io/queries', () => ({
  createBitcoinFeeRatesQueryConfig: vi.fn(() => ({
    queryKey: ['bitcoin-fee-rates'],
    queryFn: () => Promise.resolve(feeRates),
  })),
}));

vi.mock('@/hooks/use-user-settings', () => ({
  useUserSettings: () => settings,
}));

describe(useBitcoinFeeRates.name, () => {
  it('returns the tiered fee rates from the shared query config', async () => {
    const { result } = renderHookWithProviders(() => useBitcoinFeeRates());

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(feeRates);
    expect(createBitcoinFeeRatesQueryConfig).toHaveBeenCalledWith(settings);
  });
});
