import type { ComponentProps } from 'react';

import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, test, vi } from 'vitest';

import { BitcoinError } from '@leather.io/bitcoin';
import type { BitcoinTransactionFeeQuote, BitcoinTransactionFees } from '@leather.io/models';
import type { AccountRequest } from '@leather.io/services';
import { createMoney } from '@leather.io/utils';

import { BitcoinFeesLoader } from './bitcoin-fees-loader';

interface MockFeesQuery {
  data: BitcoinTransactionFees | undefined;
  isLoading: boolean;
  error: Error | null;
}

const h = vi.hoisted((): { query: MockFeesQuery } => ({
  query: { data: undefined, isLoading: false, error: null },
}));

vi.mock('@app/query/bitcoin/fees/bitcoin-transaction-fees.hooks', () => ({
  useBitcoinTransactionFees: () => h.query,
}));

function makeQuote(rate: number, sats: number): BitcoinTransactionFeeQuote {
  return {
    type: 'bitcoinFeeRate',
    value: createMoney(sats, 'BTC'),
    rate,
    rateUnit: 'sats/vB',
    estimatedTxSize: 140,
    sizeUnit: 'vB',
  };
}

const feeRates: BitcoinTransactionFees = {
  chain: 'bitcoin',
  options: {
    low: makeQuote(2, 280),
    standard: makeQuote(5, 700),
    high: makeQuote(10, 1400),
  },
};

const account: AccountRequest = {
  account: {
    id: { fingerprint: 'a1b2c3d4', accountIndex: 0 },
    bitcoin: {
      type: 'hd',
      taprootDescriptor: 'tr',
      nativeSegwitDescriptor: 'nw',
      zeroIndexNativeSegwitPayerAddress: 'bc1q123',
      zeroIndexTaprootPayerAddress: 'bc1p456',
    },
  },
};

type LoaderChildren = ComponentProps<typeof BitcoinFeesLoader>['children'];

function renderLoader() {
  const children = vi.fn<LoaderChildren>(() => <span>fees loaded</span>);
  render(
    <BitcoinFeesLoader
      account={account}
      loadingFallback={<span>loading fees</span>}
      recipients={[]}
      utxos={[]}
    >
      {children}
    </BitcoinFeesLoader>
  );
  return children;
}

function lastChildrenArgs(children: ReturnType<typeof renderLoader>) {
  const args = children.mock.lastCall;
  if (!args) throw new Error('Expected children to render');
  return args[0];
}

describe(BitcoinFeesLoader.name, () => {
  beforeEach(() => {
    h.query = { data: undefined, isLoading: false, error: null };
  });

  test('renders the loading fallback while fees load', () => {
    h.query = { data: undefined, isLoading: true, error: null };
    const children = renderLoader();
    expect(screen.getByText('loading fees')).toBeDefined();
    expect(children).not.toHaveBeenCalled();
  });

  test('renders children with the loaded fees and no error', () => {
    h.query = { data: feeRates, isLoading: false, error: null };
    const children = renderLoader();
    expect(screen.getByText('fees loaded')).toBeDefined();
    const { fees, feesError } = lastChildrenArgs(children);
    expect(feesError).toBeUndefined();
    expect(fees.standard.feeRate).toEqual(5);
    expect(fees.standard.txFee.amount.toNumber()).toEqual(700);
  });

  test('passes insufficient funds with zero-value fees instead of throwing', () => {
    h.query = { data: undefined, isLoading: false, error: new BitcoinError('InsufficientFunds') };
    const children = renderLoader();
    const { fees, feesError, isLoading } = lastChildrenArgs(children);
    expect(feesError).toEqual('insufficient-funds');
    expect(isLoading).toEqual(false);
    expect(fees.standard.feeRate).toEqual(0);
    expect(fees.standard.txFee.amount.toNumber()).toEqual(0);
  });

  test('passes insufficient funds alongside stale fees', () => {
    h.query = { data: feeRates, isLoading: false, error: new BitcoinError('InsufficientFunds') };
    const children = renderLoader();
    const { fees, feesError } = lastChildrenArgs(children);
    expect(feesError).toEqual('insufficient-funds');
    expect(fees.standard.feeRate).toEqual(5);
  });

  test('passes a failed estimate with zero-value fees when there are no fees', () => {
    h.query = { data: undefined, isLoading: false, error: new Error('Network error') };
    const children = renderLoader();
    const { fees, feesError } = lastChildrenArgs(children);
    expect(feesError).toEqual('fee-estimation-failed');
    expect(fees.standard.txFee.amount.toNumber()).toEqual(0);
  });

  test('renders stale fees with no error when a refetch fails', () => {
    h.query = { data: feeRates, isLoading: false, error: new Error('Network error') };
    const children = renderLoader();
    const { fees, feesError } = lastChildrenArgs(children);
    expect(feesError).toBeUndefined();
    expect(fees.standard.feeRate).toEqual(5);
  });
});
