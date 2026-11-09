import { calculateMaxSpend } from '@leather.io/bitcoin';
import { LEDGER_BITCOIN_MAX_INPUTS } from '@leather.io/constants';
import { createMoney } from '@leather.io/utils';

import {
  assertLedgerBitcoinInputLimit,
  getLedgerBitcoinInputLimit,
} from './ledger-bitcoin-input-limit';

const utxoAddress = 'tb1qxy5r9rlmpcxgwp92x2594q3gg026y4kdv2rsl8';
const recipientAddress = 'tb1qt28eagxcl9gvhq2rpj5slg7dwgxae2dn2hk93m';

function createUtxos(count: number, value: number) {
  return Array.from({ length: count }, (_, index) => ({
    address: utxoAddress,
    txid: index.toString(16).padStart(64, '0'),
    value,
    vout: 0,
  }));
}

function createArgs(amount: number, utxos = createUtxos(150, 10_000)) {
  const money = createMoney(amount, 'BTC');
  return {
    amount: money,
    feeRate: 2,
    recipients: [{ address: recipientAddress, amount: money }],
    utxos,
  };
}

describe(getLedgerBitcoinInputLimit.name, () => {
  const emptyLimit = { inputCount: 0, exceedsLimit: false, maxAmountWithinLimit: null };

  test('that it is empty without a fee rate', () => {
    expect(getLedgerBitcoinInputLimit({ ...createArgs(1_100_000), feeRate: undefined })).toEqual(
      emptyLimit
    );
  });

  test('that it is empty without utxos', () => {
    expect(getLedgerBitcoinInputLimit(createArgs(1_100_000, []))).toEqual(emptyLimit);
  });

  test('that it is empty with a zero amount', () => {
    expect(getLedgerBitcoinInputLimit(createArgs(0))).toEqual(emptyLimit);
  });

  test('that a send needing more than the limit exceeds it and reports a max amount', () => {
    const result = getLedgerBitcoinInputLimit(createArgs(1_100_000));
    expect(result.exceedsLimit).toEqual(true);
    expect(result.inputCount).toBeGreaterThan(LEDGER_BITCOIN_MAX_INPUTS);
    const maxAmount = result.maxAmountWithinLimit?.amount.toNumber() ?? 0;
    expect(maxAmount).toBeLessThan(50 * 10_000);
    expect(maxAmount).toBeGreaterThan(50 * 10_000 - 10_000);
  });

  test('that send max counts every economical utxo', () => {
    const utxos = createUtxos(150, 10_000);
    const { amount } = calculateMaxSpend({ recipient: recipientAddress, utxos, feeRate: 2 });
    const result = getLedgerBitcoinInputLimit({
      ...createArgs(amount.amount.toNumber(), utxos),
      isSendMax: true,
    });
    expect(result.inputCount).toEqual(150);
    expect(result.exceedsLimit).toEqual(true);
  });

  test('that the send max amount typed without the send max flag counts every economical utxo', () => {
    const utxos = createUtxos(150, 10_000);
    const { amount } = calculateMaxSpend({ recipient: recipientAddress, utxos, feeRate: 2 });
    const result = getLedgerBitcoinInputLimit(createArgs(amount.amount.toNumber(), utxos));
    expect(result.inputCount).toEqual(150);
    expect(result.exceedsLimit).toEqual(true);
  });

  test('that a send within the limit does not exceed it', () => {
    const result = getLedgerBitcoinInputLimit(createArgs(100_000, createUtxos(50, 10_000)));
    expect(result.exceedsLimit).toEqual(false);
    expect(result.maxAmountWithinLimit).toBeNull();
  });
});

describe(assertLedgerBitcoinInputLimit.name, () => {
  test('that exactly the limit is allowed', () => {
    expect(() => assertLedgerBitcoinInputLimit(LEDGER_BITCOIN_MAX_INPUTS)).not.toThrow();
  });

  test('that one input above the limit throws with both counts', () => {
    expect(() => assertLedgerBitcoinInputLimit(51)).toThrow(/at most 50 .* has 51/);
  });
});
