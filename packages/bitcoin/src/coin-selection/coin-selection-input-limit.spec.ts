import { createMoney } from '@leather.io/utils';

import { invalidAddress, recipientAddress } from '../mocks/mocks';
import { determineUtxosForSpend } from './coin-selection';
import {
  calculateMaxSpendWithinInputLimit,
  countUtxosForSpend,
} from './coin-selection-input-limit';
import { getSizeInfo } from './coin-selection.utils';

const utxoAddress = 'tb1qxy5r9rlmpcxgwp92x2594q3gg026y4kdv2rsl8';

function createUtxos(values: number[]) {
  return values.map((value, index) => ({
    address: utxoAddress,
    txid: index.toString(16).padStart(64, '0'),
    value,
    vout: 0,
  }));
}

function createRecipients(amount: number, address: string = recipientAddress) {
  return [{ address, amount: createMoney(amount, 'BTC') }];
}

describe(calculateMaxSpendWithinInputLimit.name, () => {
  test('that an empty utxo set spends nothing', () => {
    const result = calculateMaxSpendWithinInputLimit({
      recipient: recipientAddress,
      utxos: [],
      feeRate: 1,
      maxInputs: 50,
    });
    expect(result.amount.amount.toNumber()).toEqual(0);
    expect(result.fee).toEqual(0);
    expect(result.inputCount).toEqual(0);
    expect(result.economicalInputCount).toEqual(0);
  });

  test('that a zero fee rate spends nothing', () => {
    const result = calculateMaxSpendWithinInputLimit({
      recipient: recipientAddress,
      utxos: createUtxos([10_000, 10_000]),
      feeRate: 0,
      maxInputs: 50,
    });
    expect(result.amount.amount.toNumber()).toEqual(0);
    expect(result.inputCount).toEqual(0);
  });

  test('that it spends exactly the max inputs with a change output fee', () => {
    const feeRate = 5;
    const utxos = createUtxos(Array.from({ length: 150 }, () => 10_000));
    const result = calculateMaxSpendWithinInputLimit({
      recipient: recipientAddress,
      utxos,
      feeRate,
      maxInputs: 100,
    });
    const expectedFee = Math.ceil(
      getSizeInfo({ utxos: utxos.slice(0, 100), recipients: createRecipients(0) }).txVBytes *
        feeRate
    );
    expect(result.inputCount).toEqual(100);
    expect(result.economicalInputCount).toEqual(150);
    expect(result.fee).toEqual(expectedFee);
    expect(result.amount.amount.toNumber()).toEqual(100 * 10_000 - expectedFee);
  });

  test('that the largest utxos are picked first', () => {
    const feeRate = 1;
    const utxos = createUtxos([5_000, 40_000, 6_000, 50_000, 7_000]);
    const result = calculateMaxSpendWithinInputLimit({
      recipient: recipientAddress,
      utxos,
      feeRate,
      maxInputs: 2,
    });
    const expectedFee = Math.ceil(
      getSizeInfo({ utxos: utxos.slice(0, 2), recipients: createRecipients(0) }).txVBytes * feeRate
    );
    expect(result.inputCount).toEqual(2);
    expect(result.amount.amount.toNumber()).toEqual(90_000 - expectedFee);
  });

  test('that dust and uneconomical utxos are not counted', () => {
    const result = calculateMaxSpendWithinInputLimit({
      recipient: recipientAddress,
      utxos: createUtxos([200, 500, 20_000, 30_000]),
      feeRate: 10,
      maxInputs: 50,
    });
    expect(result.economicalInputCount).toEqual(2);
    expect(result.inputCount).toEqual(2);
  });

  test('that the caller utxo array is not reordered', () => {
    const utxos = createUtxos([1_000, 2_000, 3_000, 4_000]);
    const originalOrder = utxos.map(utxo => utxo.txid);
    calculateMaxSpendWithinInputLimit({
      recipient: recipientAddress,
      utxos,
      feeRate: 1,
      maxInputs: 2,
    });
    expect(utxos.map(utxo => utxo.txid)).toEqual(originalOrder);
  });

  test('that sending exactly the max stays within the limit and one sat more does not', () => {
    const feeRate = 3;
    const maxInputs = 50;
    const utxos = createUtxos(Array.from({ length: 150 }, (_, index) => 5_000 + index * 100));
    const { amount } = calculateMaxSpendWithinInputLimit({
      recipient: recipientAddress,
      utxos,
      feeRate,
      maxInputs,
    });

    const inputCountAtMax = countUtxosForSpend({
      feeRate,
      recipients: createRecipients(amount.amount.toNumber()),
      utxos,
    });
    const inputCountAboveMax = countUtxosForSpend({
      feeRate,
      recipients: createRecipients(amount.amount.toNumber() + 1),
      utxos,
    });

    expect(inputCountAtMax).not.toBeNull();
    expect(inputCountAtMax).toBeLessThanOrEqual(maxInputs);
    expect(inputCountAboveMax).toBeGreaterThan(maxInputs);
  });
});

describe(countUtxosForSpend.name, () => {
  test('that it returns the coin selection input count', () => {
    const utxos = createUtxos([10_000, 20_000, 30_000, 40_000]);
    const args = { feeRate: 2, recipients: createRecipients(55_000), utxos };
    expect(countUtxosForSpend(args)).toEqual(
      determineUtxosForSpend({ ...args, utxos: [...utxos] }).inputs.length
    );
    expect(countUtxosForSpend(args)).toEqual(2);
  });

  test('that send max counts every economical utxo', () => {
    const utxos = createUtxos([200, ...Array.from({ length: 150 }, () => 10_000)]);
    expect(
      countUtxosForSpend({ feeRate: 1, recipients: createRecipients(0), utxos, isSendMax: true })
    ).toEqual(150);
  });

  test('that insufficient funds returns null', () => {
    expect(
      countUtxosForSpend({
        feeRate: 1,
        recipients: createRecipients(1_000_000),
        utxos: createUtxos([10_000]),
      })
    ).toBeNull();
  });

  test('that an invalid recipient returns null', () => {
    expect(
      countUtxosForSpend({
        feeRate: 1,
        recipients: createRecipients(1_000, invalidAddress),
        utxos: createUtxos([10_000]),
      })
    ).toBeNull();
  });
});
