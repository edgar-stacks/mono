import { calculateMaxSpend, recipientAddress } from '@leather.io/bitcoin';
import { LEDGER_BITCOIN_MAX_INPUTS } from '@leather.io/constants';
import { createMoney } from '@leather.io/utils';

import {
  assertLedgerBitcoinInputLimit,
  getLedgerBitcoinInputLimit,
} from './ledger-bitcoin-input-limit';

function createUtxos(count: number, value: number) {
  return Array.from({ length: count }, (_, index) => ({
    txid: `utxo-${index}`,
    value,
    address: recipientAddress,
  }));
}

function createRecipients(amount: number) {
  return [{ address: recipientAddress, amount: createMoney(amount, 'BTC') }];
}

describe(getLedgerBitcoinInputLimit.name, () => {
  test('that it is empty without a fee rate', () => {
    const result = getLedgerBitcoinInputLimit({
      recipients: createRecipients(100_000),
      utxos: createUtxos(150, 10_000),
    });
    expect(result).toEqual({ inputCount: null, exceedsLimit: false, maxAmountWithinLimit: null });
  });

  test('that it is empty without utxos', () => {
    const result = getLedgerBitcoinInputLimit({
      recipients: createRecipients(100_000),
      utxos: [],
      feeRate: 5,
    });
    expect(result).toEqual({ inputCount: null, exceedsLimit: false, maxAmountWithinLimit: null });
  });

  test('that it is empty with a zero amount', () => {
    const result = getLedgerBitcoinInputLimit({
      recipients: createRecipients(0),
      utxos: createUtxos(150, 10_000),
      feeRate: 5,
    });
    expect(result).toEqual({ inputCount: null, exceedsLimit: false, maxAmountWithinLimit: null });
  });

  test('that a send needing more than the limit exceeds it and reports the max amount', () => {
    const result = getLedgerBitcoinInputLimit({
      recipients: createRecipients(1_100_000),
      utxos: createUtxos(150, 10_000),
      feeRate: 5,
    });
    expect(result.exceedsLimit).toEqual(true);
    expect(result.inputCount).toBeGreaterThan(LEDGER_BITCOIN_MAX_INPUTS);

    const maxAmount = result.maxAmountWithinLimit?.amount.toNumber() ?? 0;
    expect(maxAmount).toBeLessThan(LEDGER_BITCOIN_MAX_INPUTS * 10_000);
    expect(maxAmount).toBeGreaterThan(LEDGER_BITCOIN_MAX_INPUTS * 10_000 - 20_000);
  });

  test('that send max counts every economical utxo', () => {
    const utxos = createUtxos(150, 10_000);
    const result = getLedgerBitcoinInputLimit({
      recipients: createRecipients(0),
      utxos,
      feeRate: 5,
      isSendMax: true,
    });
    expect(result.inputCount).toEqual(150);
    expect(result.exceedsLimit).toEqual(true);
  });

  test('that the send-max amount without the send-max flag still counts every economical utxo', () => {
    const utxos = createUtxos(150, 10_000);
    const { amount } = calculateMaxSpend({ recipient: recipientAddress, utxos, feeRate: 5 });
    const result = getLedgerBitcoinInputLimit({
      recipients: [{ address: recipientAddress, amount }],
      utxos,
      feeRate: 5,
    });
    expect(result.inputCount).toEqual(150);
    expect(result.exceedsLimit).toEqual(true);
  });

  test('that a send within the limit does not exceed it', () => {
    const result = getLedgerBitcoinInputLimit({
      recipients: createRecipients(100_000),
      utxos: createUtxos(50, 10_000),
      feeRate: 5,
    });
    expect(result.exceedsLimit).toEqual(false);
    expect(result.maxAmountWithinLimit).toBeNull();
  });
});

describe(assertLedgerBitcoinInputLimit.name, () => {
  test('that exactly the limit is allowed', () => {
    expect(() => assertLedgerBitcoinInputLimit(LEDGER_BITCOIN_MAX_INPUTS)).not.toThrow();
  });

  test('that one input over the limit throws with both counts in the message', () => {
    expect(() => assertLedgerBitcoinInputLimit(LEDGER_BITCOIN_MAX_INPUTS + 1)).toThrow(/50.*51/);
  });
});
