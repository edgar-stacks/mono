import { calculateMaxSpend, getSizeInfo, recipientAddress } from '@leather.io/bitcoin';
import { LEDGER_BITCOIN_MAX_INPUTS } from '@leather.io/constants';
import type { Money } from '@leather.io/models';
import { createMoney } from '@leather.io/utils';

import {
  assertLedgerBitcoinInputLimit,
  getLedgerBitcoinInputLimit,
} from './ledger-bitcoin-input-limit';

const feeRate = 2;

function makeEqualUtxos(count: number, value: number) {
  return Array.from({ length: count }, (_, index) => ({
    txid: `txid-${index}`,
    value,
    address: recipientAddress,
  }));
}

function makeRecipients(amount: Money) {
  return [{ address: recipientAddress, amount }];
}

describe(getLedgerBitcoinInputLimit.name, () => {
  const emptyLimit = { inputCount: 0, exceedsLimit: false, maxAmountWithinLimit: null };

  test('that it is empty without a fee rate', () => {
    expect(
      getLedgerBitcoinInputLimit({
        recipients: makeRecipients(createMoney(100_000, 'BTC')),
        utxos: makeEqualUtxos(150, 10_000),
      })
    ).toEqual(emptyLimit);
  });

  test('that it is empty without utxos', () => {
    expect(
      getLedgerBitcoinInputLimit({
        recipients: makeRecipients(createMoney(100_000, 'BTC')),
        utxos: [],
        feeRate,
      })
    ).toEqual(emptyLimit);
  });

  test('that it is empty with a zero amount', () => {
    expect(
      getLedgerBitcoinInputLimit({
        recipients: makeRecipients(createMoney(0, 'BTC')),
        utxos: makeEqualUtxos(150, 10_000),
        feeRate,
      })
    ).toEqual(emptyLimit);
  });

  test('that a send needing more than the limit exceeds it and reports the max within the limit', () => {
    const utxos = makeEqualUtxos(150, 10_000);
    const result = getLedgerBitcoinInputLimit({
      recipients: makeRecipients(createMoney(1_100_000, 'BTC')),
      utxos,
      feeRate,
    });

    const expectedFee = Math.ceil(
      getSizeInfo({
        utxos: utxos.slice(0, LEDGER_BITCOIN_MAX_INPUTS),
        recipients: makeRecipients(createMoney(0, 'BTC')),
      }).txVBytes * feeRate
    );

    expect(result.exceedsLimit).toBe(true);
    expect(result.inputCount).toBeGreaterThan(LEDGER_BITCOIN_MAX_INPUTS);
    expect(result.maxAmountWithinLimit?.amount.toNumber()).toEqual(
      LEDGER_BITCOIN_MAX_INPUTS * 10_000 - expectedFee
    );
  });

  test('that send max counts every economical utxo', () => {
    const utxos = makeEqualUtxos(150, 10_000);
    const result = getLedgerBitcoinInputLimit({
      recipients: makeRecipients(createMoney(1, 'BTC')),
      utxos,
      feeRate,
      isSendMax: true,
    });
    expect(result.inputCount).toEqual(150);
    expect(result.exceedsLimit).toBe(true);
  });

  test('that the send max amount typed without the send max flag still counts every economical utxo', () => {
    const utxos = makeEqualUtxos(150, 10_000);
    const { amount } = calculateMaxSpend({ recipient: recipientAddress, utxos, feeRate });
    const result = getLedgerBitcoinInputLimit({
      recipients: makeRecipients(amount),
      utxos,
      feeRate,
    });
    expect(result.inputCount).toEqual(150);
    expect(result.exceedsLimit).toBe(true);
  });

  test('that a send within the limit does not exceed it', () => {
    const result = getLedgerBitcoinInputLimit({
      recipients: makeRecipients(createMoney(100_000, 'BTC')),
      utxos: makeEqualUtxos(50, 10_000),
      feeRate,
    });
    expect(result.exceedsLimit).toBe(false);
    expect(result.inputCount).toBeLessThanOrEqual(LEDGER_BITCOIN_MAX_INPUTS);
    expect(result.maxAmountWithinLimit).toBeNull();
  });
});

describe(assertLedgerBitcoinInputLimit.name, () => {
  test('that exactly the limit is allowed', () => {
    expect(() => assertLedgerBitcoinInputLimit(LEDGER_BITCOIN_MAX_INPUTS)).not.toThrow();
  });

  test('that one input over the limit throws with both counts in the message', () => {
    expect(() => assertLedgerBitcoinInputLimit(51)).toThrow(/50.*51/);
  });
});
