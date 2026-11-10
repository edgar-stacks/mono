import { renderHookWithProviders } from '@/tests/test-utils';
import { waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createStacksTransactionFeesQueryConfig } from '@leather.io/queries';
import { TransactionTypes, generateStacksUnsignedTransaction } from '@leather.io/stacks';
import { createMoney } from '@leather.io/utils';

import { useStacksTransactionFees } from './stacks-transaction-fees.query';

const { mockSettings, mockFees } = vi.hoisted(() => ({
  mockSettings: {
    network: { id: 'mainnet' },
    quoteCurrency: 'USD',
    assetVisibility: {},
    defaultAssetVisibility: {},
  },
  mockFees: { chain: 'stacks', options: {} },
}));

vi.mock('@leather.io/queries', () => ({
  createStacksTransactionFeesQueryConfig: vi.fn(() => ({
    queryKey: ['stacks-transaction-fees-service--get-stacks-transaction-fees'],
    queryFn: () => Promise.resolve(mockFees),
  })),
}));

vi.mock('@/hooks/use-user-settings', () => ({
  useUserSettings: () => mockSettings,
}));

const publicKey = '8721c6a5237f5e8d361161a7855aa56885a3e19e2ea6ee268fb14eabc5e2ed9001';

function createUnsignedTx() {
  return generateStacksUnsignedTransaction({
    txType: TransactionTypes.StxTokenTransfer,
    amount: createMoney(0, 'STX'),
    fee: createMoney(0, 'STX'),
    nonce: 0,
    recipient: 'SP2417H88DQFN7FNDMSKM9N0B3Q6GNGEM40W7ZAZW',
    publicKey,
  });
}

describe('useStacksTransactionFees', () => {
  beforeEach(() => {
    vi.mocked(createStacksTransactionFeesQueryConfig).mockClear();
  });

  it('stays idle without building the config when there is no transaction', () => {
    const { result } = renderHookWithProviders(() => useStacksTransactionFees());

    expect(result.current.status).toBe('pending');
    expect(result.current.fetchStatus).toBe('idle');
    expect(createStacksTransactionFeesQueryConfig).not.toHaveBeenCalled();
  });

  it('returns the fee quotes for the transaction', async () => {
    const unsignedTx = await createUnsignedTx();

    const { result } = renderHookWithProviders(() => useStacksTransactionFees(unsignedTx));

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(createStacksTransactionFeesQueryConfig).toHaveBeenCalledWith(unsignedTx, mockSettings);
    expect(result.current.data).toEqual(mockFees);
  });
});
