import { createMoney } from '@leather.io/utils';

import { invalidAddress, recipientAddress } from '../mocks/mocks';
import { determineUtxosForSpend } from './coin-selection';
import {
  calculateMaxSpendWithinInputLimit,
  countUtxosForSpend,
} from './coin-selection-input-limit';
import { getSizeInfo } from './coin-selection.utils';

function createUtxos(values: number[]) {
  return values.map((value, index) => ({
    txid: `utxo-${index}`,
    value,
    address: recipientAddress,
  }));
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

  test('that only maxInputs utxos are used and the fee includes a change output', () => {
    const feeRate = 5;
    const utxos = createUtxos(Array<number>(150).fill(10_000));
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

  test('that sending exactly the max selects at most maxInputs inputs and one sat more selects more', () => {
    const feeRate = 5;
    const maxInputs = 100;
    const utxos = createUtxos(Array<number>(150).fill(10_000));
    const { amount } = calculateMaxSpendWithinInputLimit({
      recipient: recipientAddress,
      utxos,
      feeRate,
      maxInputs,
    });

    const atMax = determineUtxosForSpend({
      utxos: [...utxos],
      feeRate,
      recipients: [{ address: recipientAddress, amount }],
    });
    expect(atMax.inputs.length).toBeLessThanOrEqual(maxInputs);

    const overMax = determineUtxosForSpend({
      utxos: [...utxos],
      feeRate,
      recipients: [
        { address: recipientAddress, amount: createMoney(amount.amount.plus(1), 'BTC') },
      ],
    });
    expect(overMax.inputs.length).toBeGreaterThan(maxInputs);
  });

  test('that the largest utxos are picked first', () => {
    const feeRate = 1;
    const utxos = createUtxos([10_000, 50_000, 20_000, 40_000, 30_000]);
    const result = calculateMaxSpendWithinInputLimit({
      recipient: recipientAddress,
      utxos,
      feeRate,
      maxInputs: 2,
    });
    expect(result.inputCount).toEqual(2);
    expect(result.amount.amount.toNumber()).toEqual(90_000 - result.fee);
  });

  test('that dust and uneconomical utxos are not counted', () => {
    const utxos = createUtxos([10_000, 10_000, 100, 500]);
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
    const utxos = createUtxos([10_000, 50_000, 20_000]);
    const order = utxos.map(utxo => utxo.txid);
    calculateMaxSpendWithinInputLimit({
      recipient: recipientAddress,
      utxos,
      feeRate: 1,
      maxInputs: 2,
    });
    expect(utxos.map(utxo => utxo.txid)).toEqual(order);
  });
});

describe(countUtxosForSpend.name, () => {
  test('that it returns the number of inputs coin selection picks', () => {
    const utxos = createUtxos(Array<number>(10).fill(10_000));
    const recipients = [{ address: recipientAddress, amount: createMoney(25_000, 'BTC') }];
    const expected = determineUtxosForSpend({ utxos: [...utxos], feeRate: 2, recipients });

    expect(countUtxosForSpend({ utxos, feeRate: 2, recipients })).toEqual(expected.inputs.length);
  });

  test('that send max counts every economical utxo', () => {
    const utxos = createUtxos([...Array<number>(10).fill(10_000), 100]);
    const recipients = [{ address: recipientAddress, amount: createMoney(1_000, 'BTC') }];

    expect(countUtxosForSpend({ utxos, feeRate: 2, recipients, isSendMax: true })).toEqual(10);
  });

  test('that insufficient funds returns null', () => {
    const utxos = createUtxos([10_000]);
    const recipients = [{ address: recipientAddress, amount: createMoney(20_000, 'BTC') }];

    expect(countUtxosForSpend({ utxos, feeRate: 2, recipients })).toBeNull();
  });

  test('that an invalid recipient returns null', () => {
    const utxos = createUtxos([10_000]);
    const recipients = [{ address: invalidAddress, amount: createMoney(1_000, 'BTC') }];

    expect(countUtxosForSpend({ utxos, feeRate: 2, recipients })).toBeNull();
  });
});
