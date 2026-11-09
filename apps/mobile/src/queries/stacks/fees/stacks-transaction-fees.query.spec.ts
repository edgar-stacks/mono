import { renderHookWithProviders } from '@/tests/test-utils';
import { makeUnsignedSTXTokenTransfer } from '@stacks/transactions';
import { waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, test, vi } from 'vitest';

import { createStacksTransactionFeesQueryConfig } from '@leather.io/queries';

import { useStacksTransactionFees } from './stacks-transaction-fees.query';

const settings = { network: { id: 'mainnet' }, quoteCurrency: 'USD', assetVisibility: {} };
const transactionFees = { chain: 'stacks', options: {} };

vi.mock('@/hooks/use-user-settings', () => ({
  useUserSettings: () => settings,
}));

vi.mock('@leather.io/queries', () => ({
  createStacksTransactionFeesQueryConfig: vi.fn(() => ({
    queryKey: ['stacks-transaction-fees'],
    queryFn: () => Promise.resolve(transactionFees),
  })),
}));

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
    vi.mocked(createStacksTransactionFeesQueryConfig).mockClear();
  });

  test('returns the fee quotes for the transaction', async () => {
    const tx = await makeTransaction();
    const { result } = renderHookWithProviders(() => useStacksTransactionFees(tx));

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(transactionFees);
    expect(createStacksTransactionFeesQueryConfig).toHaveBeenCalledWith(tx, settings);
  });

  test('stays idle without a transaction', () => {
    const { result } = renderHookWithProviders(() => useStacksTransactionFees());

    expect(result.current.isPending).toBe(true);
    expect(result.current.fetchStatus).toEqual('idle');
    expect(createStacksTransactionFeesQueryConfig).not.toHaveBeenCalled();
  });
});
