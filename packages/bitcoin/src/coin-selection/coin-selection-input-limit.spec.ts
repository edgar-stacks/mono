import { createMoney } from '@leather.io/utils';

import { invalidAddress, recipientAddress } from '../mocks/mocks';
import { determineUtxosForSpend } from './coin-selection';
import {
  calculateMaxSpendWithinInputLimit,
  countUtxosForSpend,
} from './coin-selection-input-limit';
import { getSizeInfo } from './coin-selection.utils';

function createUtxos(count: number, value: number, prefix = 'u') {
  return Array.from({ length: count }, (_, index) => ({
    txid: `${prefix}${index}`,
    value,
    address: recipientAddress,
  }));
}

function createRecipients(amount: number) {
  return [{ address: recipientAddress, amount: createMoney(amount, 'BTC') }];
}

describe(calculateMaxSpendWithinInputLimit.name, () => {
  test('that an empty utxo set spends nothing', () => {
    const result = calculateMaxSpendWithinInputLimit({
      recipient: recipientAddress,
      utxos: [],
      feeRate: 10,
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
      utxos: createUtxos(10, 10_000),
      feeRate: 0,
      maxInputs: 50,
    });
    expect(result.amount.amount.toNumber()).toEqual(0);
    expect(result.inputCount).toEqual(0);
  });

  test('that it uses exactly the max inputs and pays the fee of a change output', () => {
    const utxos = createUtxos(150, 10_000);
    const feeRate = 5;
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

  test('that sending exactly the max selects at most max inputs and one sat more selects more', () => {
    const utxos = createUtxos(150, 10_000);
    const feeRate = 5;
    const maxInputs = 50;
    const { amount } = calculateMaxSpendWithinInputLimit({
      recipient: recipientAddress,
      utxos,
      feeRate,
      maxInputs,
    });
    const maxAmount = amount.amount.toNumber();

    const atMax = determineUtxosForSpend({
      utxos: [...utxos],
      feeRate,
      recipients: createRecipients(maxAmount),
    });
    const overMax = determineUtxosForSpend({
      utxos: [...utxos],
      feeRate,
      recipients: createRecipients(maxAmount + 1),
    });
    expect(atMax.inputs.length).toBeLessThanOrEqual(maxInputs);
    expect(overMax.inputs.length).toBeGreaterThan(maxInputs);
  });

  test('that the largest utxos are picked first', () => {
    const utxos = [
      ...createUtxos(5, 10_000, 'small'),
      ...createUtxos(3, 100_000, 'large'),
      ...createUtxos(5, 20_000, 'medium'),
    ];
    const feeRate = 2;
    const result = calculateMaxSpendWithinInputLimit({
      recipient: recipientAddress,
      utxos,
      feeRate,
      maxInputs: 3,
    });
    expect(result.inputCount).toEqual(3);
    expect(result.amount.amount.toNumber()).toEqual(300_000 - result.fee);
  });

  test('that dust and uneconomical utxos are not counted', () => {
    const utxos = [
      ...createUtxos(4, 10_000, 'economical'),
      { txid: 'dust', value: 100, address: recipientAddress },
      { txid: 'uneconomical', value: 500, address: recipientAddress },
    ];
    const result = calculateMaxSpendWithinInputLimit({
      recipient: recipientAddress,
      utxos,
      feeRate: 20,
      maxInputs: 50,
    });
    expect(result.economicalInputCount).toEqual(4);
    expect(result.inputCount).toEqual(4);
  });

  test('that the caller utxo array is not reordered', () => {
    const utxos = [
      { txid: 'a', value: 1_000, address: recipientAddress },
      { txid: 'b', value: 50_000, address: recipientAddress },
      { txid: 'c', value: 20_000, address: recipientAddress },
    ];
    const txids = utxos.map(utxo => utxo.txid);
    calculateMaxSpendWithinInputLimit({
      recipient: recipientAddress,
      utxos,
      feeRate: 1,
      maxInputs: 2,
    });
    expect(utxos.map(utxo => utxo.txid)).toEqual(txids);
  });
});

describe(countUtxosForSpend.name, () => {
  test('that it returns the number of inputs coin selection picks', () => {
    const utxos = createUtxos(20, 10_000);
    const args = { utxos, feeRate: 5, recipients: createRecipients(55_000) };
    expect(countUtxosForSpend(args)).toEqual(
      determineUtxosForSpend({ ...args, utxos: [...utxos] }).inputs.length
    );
  });

  test('that send max counts every economical utxo', () => {
    const utxos = [
      ...createUtxos(20, 10_000),
      { txid: 'dust', value: 100, address: recipientAddress },
    ];
    expect(
      countUtxosForSpend({
        utxos,
        feeRate: 5,
        recipients: createRecipients(0),
        isSendMax: true,
      })
    ).toEqual(20);
  });

  test('that it returns null for insufficient funds', () => {
    expect(
      countUtxosForSpend({
        utxos: createUtxos(2, 10_000),
        feeRate: 5,
        recipients: createRecipients(1_000_000),
      })
    ).toBeNull();
  });

  test('that it returns null for an invalid recipient', () => {
    expect(
      countUtxosForSpend({
        utxos: createUtxos(2, 10_000),
        feeRate: 5,
        recipients: [{ address: invalidAddress, amount: createMoney(1_000, 'BTC') }],
      })
    ).toBeNull();
  });
});
