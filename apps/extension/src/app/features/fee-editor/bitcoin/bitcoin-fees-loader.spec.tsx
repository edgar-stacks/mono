import { renderToString } from 'react-dom/server';

import { beforeEach, describe, expect, test, vi } from 'vitest';

import { BitcoinError } from '@leather.io/bitcoin';
import type { AccountRequest } from '@leather.io/services';
import { createMoney } from '@leather.io/utils';

import type { Fee, FeePriority, Fees } from '../fee-editor.context';
import { BitcoinFeesLoader } from './bitcoin-fees-loader';

const h = vi.hoisted((): { error: unknown; fees: unknown; isLoading: boolean } => ({
  error: null,
  fees: undefined,
  isLoading: false,
}));

vi.mock('@app/query/bitcoin/fees/bitcoin-transaction-fees.hooks', () => ({
  useBitcoinTransactionFees: () => ({ data: undefined, isLoading: h.isLoading, error: h.error }),
}));

vi.mock('./use-bitcoin-fees', () => ({
  useBitcoinFees: () => h.fees,
}));

function createFee(priority: FeePriority, sats: number): Fee {
  return { priority, feeRate: sats, txFee: createMoney(sats, 'BTC'), time: '' };
}

const loadedFees: Fees = {
  slow: createFee('slow', 100),
  standard: createFee('standard', 200),
  fast: createFee('fast', 300),
  custom: createFee('custom', 200),
};

const account: AccountRequest = {
  account: { id: { fingerprint: 'a1b2c3d4', accountIndex: 0 } },
};

function renderLoader() {
  const children = vi.fn<(fees: unknown) => React.ReactNode>(() => <span>children</span>);
  const html = renderToString(
    <BitcoinFeesLoader
      account={account}
      loadingFallback={<span>loading</span>}
      recipients={[]}
      utxos={[]}
    >
      {children}
    </BitcoinFeesLoader>
  );
  return { children, html };
}

function zeroFee(priority: FeePriority) {
  return { priority, txFee: createMoney(0, 'BTC'), time: '' };
}

const zeroFees = {
  slow: zeroFee('slow'),
  standard: zeroFee('standard'),
  fast: zeroFee('fast'),
  custom: zeroFee('custom'),
};

describe(BitcoinFeesLoader.name, () => {
  beforeEach(() => {
    h.error = null;
    h.fees = undefined;
    h.isLoading = false;
  });

  test('renders the loading fallback while fees load', () => {
    h.isLoading = true;
    const { children, html } = renderLoader();
    expect(html).toContain('loading');
    expect(children).not.toHaveBeenCalled();
  });

  test('passes loaded fees with no error', () => {
    h.fees = loadedFees;
    const { children, html } = renderLoader();
    expect(html).toContain('children');
    expect(children).toHaveBeenCalledWith(
      expect.objectContaining({ fees: loadedFees, isLoading: false })
    );
    expect(children.mock.calls[0]?.[0]).not.toHaveProperty('feesError');
  });

  test('passes zero-value fees and the insufficient funds reason without fees', () => {
    h.error = new BitcoinError('InsufficientFunds');
    const { children } = renderLoader();
    expect(children).toHaveBeenCalledWith(
      expect.objectContaining({ fees: zeroFees, feesError: 'insufficient-funds' })
    );
  });

  test('passes stale fees with the insufficient funds reason', () => {
    h.error = new BitcoinError('InsufficientFunds');
    h.fees = loadedFees;
    const { children } = renderLoader();
    expect(children).toHaveBeenCalledWith(
      expect.objectContaining({ fees: loadedFees, feesError: 'insufficient-funds' })
    );
  });

  test('passes zero-value fees and the estimation failed reason without fees', () => {
    h.error = new Error('Network error');
    const { children } = renderLoader();
    expect(children).toHaveBeenCalledWith(
      expect.objectContaining({ fees: zeroFees, feesError: 'fee-estimation-failed' })
    );
  });

  test('passes stale fees with no error after a generic refetch error', () => {
    h.error = new Error('Network error');
    h.fees = loadedFees;
    const { children } = renderLoader();
    expect(children).toHaveBeenCalledWith(expect.objectContaining({ fees: loadedFees }));
    expect(children.mock.calls[0]?.[0]).not.toHaveProperty('feesError');
  });

  test('never throws on an insufficient funds error', () => {
    h.error = new BitcoinError('InsufficientFunds');
    expect(() => renderLoader()).not.toThrow();
  });
});
