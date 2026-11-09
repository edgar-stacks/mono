import { renderHookWithProviders } from '@/tests/test-utils';
import { makeUnsignedSTXTokenTransfer } from '@stacks/transactions';
import { waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { type StacksTransactionFees, defaultNetworksKeyedById } from '@leather.io/models';
import type { UserSettings } from '@leather.io/services';
import { createMoney } from '@leather.io/utils';

import { useStacksTransactionFees } from './stacks-transaction-fees.query';

const mocks = vi.hoisted(() => ({
  createStacksTransactionFeesQueryConfig: vi.fn(),
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
  createStacksTransactionFeesQueryConfig: mocks.createStacksTransactionFeesQueryConfig,
}));

function createQuote(fee: number) {
  return {
    type: 'stacksFeeRate',
    value: createMoney(fee, 'STX'),
    rate: 1,
    rateUnit: 'µSTX/byte',
    estimatedTxSize: 180,
    sizeUnit: 'byte',
  } as const;
}

const fees: StacksTransactionFees = {
  chain: 'stacks',
  minimumFee: createMoney(180, 'STX'),
  highFeeThreshold: createMoney(500000, 'STX'),
  options: {
    low: createQuote(1000),
    standard: createQuote(2000),
    high: createQuote(4000),
  },
};

function makeTransaction() {
  return makeUnsignedSTXTokenTransfer({
    publicKey: '0250863ad64a87ae8a2fe83c1af1a8403cb53f53e486d8511dad8a04887e5b2352',
    recipient: 'ST2CY5V39NHDPWSXMW9QDT3HC3GD6Q6XX4CFRK9AG',
    amount: 0,
    fee: 0,
    nonce: 0,
    network: 'testnet',
  });
}

describe(useStacksTransactionFees.name, () => {
  beforeEach(() => {
    mocks.createStacksTransactionFeesQueryConfig.mockReset();
    mocks.createStacksTransactionFeesQueryConfig.mockReturnValue({
      queryKey: ['stacks-transaction-fees'],
      queryFn: () => Promise.resolve(fees),
    });
  });

  it('stays idle without a transaction', () => {
    const { result } = renderHookWithProviders(() => useStacksTransactionFees());

    expect(result.current.fetchStatus).toBe('idle');
    expect(result.current.data).toBeUndefined();
    expect(mocks.createStacksTransactionFeesQueryConfig).not.toHaveBeenCalled();
  });

  it('returns the quotes for the given transaction', async () => {
    const tx = await makeTransaction();
    const { result } = renderHookWithProviders(() => useStacksTransactionFees(tx));

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mocks.createStacksTransactionFeesQueryConfig).toHaveBeenCalledWith(tx, settings);
    expect(result.current.data).toEqual(fees);
  });
});
