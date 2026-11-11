import { renderToString } from 'react-dom/server';

import { BitcoinError } from '@leather.io/bitcoin';
import type { AccountRequest } from '@leather.io/services';
import { createMoney } from '@leather.io/utils';

import type { Fees, FeesErrorReason } from '../fee-editor.context';
import { BitcoinFeesLoader } from './bitcoin-fees-loader';

const useBitcoinTransactionFeesMock = vi.fn<() => unknown>();

vi.mock('@app/query/bitcoin/fees/bitcoin-transaction-fees.hooks', () => ({
  useBitcoinTransactionFees: () => useBitcoinTransactionFeesMock(),
}));

const account: AccountRequest = { account: { id: { fingerprint: 'a1b2c3d4', accountIndex: 0 } } };

function feeQuote(rate: number) {
  return { rate, value: createMoney(rate * 100, 'BTC') };
}

const feeRates = {
  options: { low: feeQuote(1), standard: feeQuote(5), high: feeQuote(10) },
};

interface RenderedFees {
  fees: Fees;
  feesError?: FeesErrorReason;
  isLoading: boolean;
}

function renderLoader() {
  const rendered: RenderedFees[] = [];
  const html = renderToString(
    <BitcoinFeesLoader
      account={account}
      loadingFallback={<span>loading</span>}
      recipients={[]}
      utxos={[]}
    >
      {({ fees, feesError, isLoading }) => {
        rendered.push({ fees, feesError, isLoading });
        return <span>loaded</span>;
      }}
    </BitcoinFeesLoader>
  );
  return { html, rendered: rendered[0] };
}

describe(BitcoinFeesLoader.name, () => {
  test('renders the loading fallback while fees load', () => {
    useBitcoinTransactionFeesMock.mockReturnValue({
      data: undefined,
      isLoading: true,
      error: null,
    });
    const { html, rendered } = renderLoader();
    expect(html).toContain('loading');
    expect(rendered).toBeUndefined();
  });

  test('passes loaded fees without an error', () => {
    useBitcoinTransactionFeesMock.mockReturnValue({
      data: feeRates,
      isLoading: false,
      error: null,
    });
    const { html, rendered } = renderLoader();
    expect(html).toContain('loaded');
    expect(rendered?.feesError).toBeUndefined();
    expect(rendered?.fees.standard.feeRate).toEqual(5);
  });

  test('passes zero-value fees with an insufficient funds error', () => {
    useBitcoinTransactionFeesMock.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: new BitcoinError('InsufficientFunds'),
    });
    const { rendered } = renderLoader();
    expect(rendered?.feesError).toEqual('insufficient-funds');
    expect(rendered?.fees.standard.txFee.amount.toNumber()).toEqual(0);
    expect(rendered?.fees.standard.feeRate).toBeUndefined();
  });

  test('passes stale fees with an insufficient funds error', () => {
    useBitcoinTransactionFeesMock.mockReturnValue({
      data: feeRates,
      isLoading: false,
      error: new BitcoinError('InsufficientFunds'),
    });
    const { rendered } = renderLoader();
    expect(rendered?.feesError).toEqual('insufficient-funds');
    expect(rendered?.fees.standard.feeRate).toEqual(5);
  });

  test('passes zero-value fees with a fee estimation error', () => {
    useBitcoinTransactionFeesMock.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: new Error('Network error'),
    });
    const { rendered } = renderLoader();
    expect(rendered?.feesError).toEqual('fee-estimation-failed');
    expect(rendered?.fees.standard.txFee.amount.toNumber()).toEqual(0);
  });

  test('renders stale fees without an error when a refetch fails', () => {
    useBitcoinTransactionFeesMock.mockReturnValue({
      data: feeRates,
      isLoading: false,
      error: new Error('Network error'),
    });
    const { rendered } = renderLoader();
    expect(rendered?.feesError).toBeUndefined();
    expect(rendered?.fees.standard.feeRate).toEqual(5);
  });
});
