import { createMoney } from '@leather.io/utils';

import { invalidAddress, recipientAddress } from '../mocks/mocks';
import { determineUtxosForSpend } from './coin-selection';
import {
  calculateMaxSpendWithinInputLimit,
  countUtxosForSpend,
} from './coin-selection-input-limit';
import { getSizeInfo } from './coin-selection.utils';

function makeUtxos(values: number[]) {
  return values.map((value, index) => ({
    txid: `txid-${index}`,
    value,
    address: recipientAddress,
  }));
}

function makeEqualUtxos(count: number, value: number) {
  return makeUtxos(Array.from({ length: count }, () => value));
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
      utxos: makeEqualUtxos(10, 10_000),
      feeRate: 0,
      maxInputs: 50,
    });
    expect(result.amount.amount.toNumber()).toEqual(0);
    expect(result.inputCount).toEqual(0);
  });

  test('that it uses exactly maxInputs inputs and pays the fee of a tx with a change output', () => {
    const utxos = makeEqualUtxos(150, 10_000);
    const feeRate = 2;
    const result = calculateMaxSpendWithinInputLimit({
      recipient: recipientAddress,
      utxos,
      feeRate,
      maxInputs: 100,
    });

    const expectedSize = getSizeInfo({
      utxos: utxos.slice(0, 100),
      recipients: [{ address: recipientAddress, amount: createMoney(0, 'BTC') }],
    });
    const expectedFee = Math.ceil(expectedSize.txVBytes * feeRate);

    expect(result.inputCount).toEqual(100);
    expect(result.economicalInputCount).toEqual(150);
    expect(result.fee).toEqual(expectedFee);
    expect(result.amount.amount.toNumber()).toEqual(100 * 10_000 - expectedFee);
  });

  test('that it picks the largest utxos first', () => {
    const utxos = makeUtxos([5_000, 20_000, 10_000, 30_000]);
    const feeRate = 1;
    const result = calculateMaxSpendWithinInputLimit({
      recipient: recipientAddress,
      utxos,
      feeRate,
      maxInputs: 2,
    });
    expect(result.inputCount).toEqual(2);
    expect(result.amount.amount.toNumber()).toEqual(50_000 - result.fee);
  });

  test('that dust and uneconomical utxos are not counted', () => {
    const utxos = makeUtxos([200, 500, 10_000, 20_000]);
    const result = calculateMaxSpendWithinInputLimit({
      recipient: recipientAddress,
      utxos,
      feeRate: 10,
      maxInputs: 50,
    });
    expect(result.economicalInputCount).toEqual(2);
    expect(result.inputCount).toEqual(2);
  });

  test('that the caller array is not reordered', () => {
    const utxos = makeUtxos([5_000, 20_000, 10_000, 30_000]);
    const originalOrder = utxos.map(utxo => utxo.txid);
    calculateMaxSpendWithinInputLimit({
      recipient: recipientAddress,
      utxos,
      feeRate: 1,
      maxInputs: 2,
    });
    expect(utxos.map(utxo => utxo.txid)).toEqual(originalOrder);
  });

  test('that sending exactly the max selects at most maxInputs inputs and one sat more selects more', () => {
    const utxos = makeEqualUtxos(150, 10_000);
    const feeRate = 3;
    const maxInputs = 50;
    const { amount } = calculateMaxSpendWithinInputLimit({
      recipient: recipientAddress,
      utxos,
      feeRate,
      maxInputs,
    });

    const atMax = determineUtxosForSpend({
      feeRate,
      recipients: [{ address: recipientAddress, amount }],
      utxos: [...utxos],
    });
    expect(atMax.inputs.length).toBeLessThanOrEqual(maxInputs);

    const oneSatMore = determineUtxosForSpend({
      feeRate,
      recipients: [
        { address: recipientAddress, amount: createMoney(amount.amount.plus(1), 'BTC') },
      ],
      utxos: [...utxos],
    });
    expect(oneSatMore.inputs.length).toBeGreaterThan(maxInputs);
  });
});

describe(countUtxosForSpend.name, () => {
  test('that it returns the number of inputs coin selection picks', () => {
    const utxos = makeEqualUtxos(20, 10_000);
    const args = {
      feeRate: 1,
      recipients: [{ address: recipientAddress, amount: createMoney(45_000, 'BTC') }],
    };
    const expected = determineUtxosForSpend({ ...args, utxos: [...utxos] }).inputs.length;
    expect(countUtxosForSpend({ ...args, utxos })).toEqual(expected);
    expect(expected).toEqual(5);
  });

  test('that it counts every economical utxo for send max', () => {
    const utxos = makeUtxos([200, 500, ...Array.from({ length: 60 }, () => 10_000)]);
    const count = countUtxosForSpend({
      feeRate: 10,
      recipients: [{ address: recipientAddress, amount: createMoney(1, 'BTC') }],
      utxos,
      isSendMax: true,
    });
    expect(count).toEqual(60);
  });

  test('that it returns null for insufficient funds', () => {
    const count = countUtxosForSpend({
      feeRate: 1,
      recipients: [{ address: recipientAddress, amount: createMoney(1_000_000, 'BTC') }],
      utxos: makeEqualUtxos(5, 10_000),
    });
    expect(count).toBeNull();
  });

  test('that it returns null for an invalid recipient', () => {
    const count = countUtxosForSpend({
      feeRate: 1,
      recipients: [{ address: invalidAddress, amount: createMoney(1_000, 'BTC') }],
      utxos: makeEqualUtxos(5, 10_000),
    });
    expect(count).toBeNull();
  });
});
