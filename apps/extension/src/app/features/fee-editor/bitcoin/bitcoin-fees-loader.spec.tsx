import { renderToString } from 'react-dom/server';

import { beforeEach, describe, expect, test, vi } from 'vitest';

import { BitcoinError } from '@leather.io/bitcoin';
import type { AccountRequest } from '@leather.io/services';
import { createMoney } from '@leather.io/utils';

import type { Fee, FeePriority, Fees, FeesErrorReason } from '../fee-editor.context';
import { BitcoinFeesLoader } from './bitcoin-fees-loader';

interface MockFeesQuery {
  data: unknown;
  isLoading: boolean;
  error: unknown;
}

const h = vi.hoisted((): { query: MockFeesQuery; fees: unknown } => ({
  query: { data: undefined, isLoading: false, error: null },
  fees: undefined,
}));

vi.mock('@app/query/bitcoin/fees/bitcoin-transaction-fees.hooks', () => ({
  useBitcoinTransactionFees: () => h.query,
}));

vi.mock('./use-bitcoin-fees', () => ({
  useBitcoinFees: () => h.fees,
}));

const account: AccountRequest = { account: { id: { fingerprint: 'a1b2c3d4', accountIndex: 0 } } };

function makeFee(priority: FeePriority, sats: number): Fee {
  return { priority, feeRate: sats, txFee: createMoney(sats, 'BTC'), time: '' };
}

const loadedFees: Fees = {
  slow: makeFee('slow', 100),
  standard: makeFee('standard', 200),
  fast: makeFee('fast', 300),
  custom: makeFee('custom', 200),
};

interface RenderedFees {
  fees: Fees;
  feesError?: FeesErrorReason;
}

function renderLoader() {
  const rendered: RenderedFees[] = [];
  const html = renderToString(
    <BitcoinFeesLoader
      account={account}
      loadingFallback={<span>loading-fallback</span>}
      recipients={[]}
      utxos={[]}
    >
      {({ fees, feesError }) => {
        rendered.push({ fees, feesError });
        return <span>loaded</span>;
      }}
    </BitcoinFeesLoader>
  );
  return { html, rendered: rendered.at(-1) };
}

function expectZeroFees(fees: Fees | undefined) {
  expect(fees?.standard.txFee.amount.toNumber()).toEqual(0);
  expect(fees?.standard.feeRate).toEqual(0);
}

describe(BitcoinFeesLoader.name, () => {
  beforeEach(() => {
    h.query = { data: undefined, isLoading: false, error: null };
    h.fees = undefined;
  });

  test('renders the loading fallback while fees load', () => {
    h.query = { data: undefined, isLoading: true, error: null };

    const { html, rendered } = renderLoader();

    expect(html).toContain('loading-fallback');
    expect(rendered).toBeUndefined();
  });

  test('passes loaded fees with no error', () => {
    h.query = { data: {}, isLoading: false, error: null };
    h.fees = loadedFees;

    const { html, rendered } = renderLoader();

    expect(html).toContain('loaded');
    expect(rendered?.fees).toBe(loadedFees);
    expect(rendered?.feesError).toBeUndefined();
  });

  test('passes an insufficient-funds error with zero fees instead of throwing', () => {
    h.query = { data: undefined, isLoading: false, error: new BitcoinError('InsufficientFunds') };

    const { rendered } = renderLoader();

    expect(rendered?.feesError).toEqual('insufficient-funds');
    expectZeroFees(rendered?.fees);
  });

  test('keeps stale fees alongside an insufficient-funds error', () => {
    h.query = { data: {}, isLoading: false, error: new BitcoinError('InsufficientFunds') };
    h.fees = loadedFees;

    const { rendered } = renderLoader();

    expect(rendered?.feesError).toEqual('insufficient-funds');
    expect(rendered?.fees).toBe(loadedFees);
  });

  test('passes a fee-estimation-failed error with zero fees when no fees loaded', () => {
    h.query = { data: undefined, isLoading: false, error: new Error('Network error') };

    const { rendered } = renderLoader();

    expect(rendered?.feesError).toEqual('fee-estimation-failed');
    expectZeroFees(rendered?.fees);
  });

  test('renders stale fees with no error after a failed refetch', () => {
    h.query = { data: {}, isLoading: false, error: new Error('Network error') };
    h.fees = loadedFees;

    const { rendered } = renderLoader();

    expect(rendered?.feesError).toBeUndefined();
    expect(rendered?.fees).toBe(loadedFees);
  });
});
