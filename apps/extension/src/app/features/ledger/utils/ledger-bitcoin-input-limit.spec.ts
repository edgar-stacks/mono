import { calculateMaxSpend, getSizeInfo, recipientAddress } from '@leather.io/bitcoin';
import { LEDGER_BITCOIN_MAX_INPUTS } from '@leather.io/constants';
import { createMoney } from '@leather.io/utils';

import {
  assertLedgerBitcoinInputLimit,
  getLedgerBitcoinInputLimit,
  isPsbtOverLedgerInputLimit,
} from './ledger-bitcoin-input-limit';

function createUtxos(count: number, value: number) {
  return Array.from({ length: count }, (_, index) => ({
    txid: `utxo${index}`,
    value,
    address: recipientAddress,
  }));
}

const feeRate = 5;

describe(getLedgerBitcoinInputLimit.name, () => {
  test('that it is empty without a fee rate', () => {
    expect(
      getLedgerBitcoinInputLimit({
        recipient: recipientAddress,
        amount: createMoney(1_100_000, 'BTC'),
        utxos: createUtxos(150, 10_000),
      })
    ).toEqual({ inputCount: 0, exceedsLimit: false, maxAmountWithinLimit: null });
  });

  test('that it is empty without utxos', () => {
    expect(
      getLedgerBitcoinInputLimit({
        recipient: recipientAddress,
        amount: createMoney(1_100_000, 'BTC'),
        utxos: [],
        feeRate,
      })
    ).toEqual({ inputCount: 0, exceedsLimit: false, maxAmountWithinLimit: null });
  });

  test('that it is empty with a zero amount', () => {
    expect(
      getLedgerBitcoinInputLimit({
        recipient: recipientAddress,
        amount: createMoney(0, 'BTC'),
        utxos: createUtxos(150, 10_000),
        feeRate,
      })
    ).toEqual({ inputCount: 0, exceedsLimit: false, maxAmountWithinLimit: null });
  });

  test('that a send needing more than the limit exceeds it and reports the max amount', () => {
    const utxos = createUtxos(150, 10_000);
    const result = getLedgerBitcoinInputLimit({
      recipient: recipientAddress,
      amount: createMoney(1_100_000, 'BTC'),
      utxos,
      feeRate,
    });
    const expectedFee = Math.ceil(
      getSizeInfo({
        utxos: utxos.slice(0, LEDGER_BITCOIN_MAX_INPUTS),
        recipients: [{ address: recipientAddress, amount: createMoney(0, 'BTC') }],
      }).txVBytes * feeRate
    );
    expect(result.exceedsLimit).toBe(true);
    expect(result.inputCount).toBeGreaterThan(LEDGER_BITCOIN_MAX_INPUTS);
    expect(result.maxAmountWithinLimit?.amount.toNumber()).toEqual(
      LEDGER_BITCOIN_MAX_INPUTS * 10_000 - expectedFee
    );
  });

  test('that send max counts every economical utxo', () => {
    const result = getLedgerBitcoinInputLimit({
      recipient: recipientAddress,
      amount: createMoney(0, 'BTC'),
      utxos: createUtxos(150, 10_000),
      feeRate,
      isSendMax: true,
    });
    expect(result.inputCount).toEqual(150);
    expect(result.exceedsLimit).toBe(true);
  });

  test('that the send max amount typed without the send max flag counts every economical utxo', () => {
    const utxos = createUtxos(150, 10_000);
    const { amount } = calculateMaxSpend({ recipient: recipientAddress, utxos, feeRate });
    const result = getLedgerBitcoinInputLimit({
      recipient: recipientAddress,
      amount,
      utxos,
      feeRate,
    });
    expect(result.inputCount).toEqual(150);
    expect(result.exceedsLimit).toBe(true);
  });

  test('that a send within the limit does not exceed it', () => {
    const result = getLedgerBitcoinInputLimit({
      recipient: recipientAddress,
      amount: createMoney(100_000, 'BTC'),
      utxos: createUtxos(50, 10_000),
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

  test('that one input over the limit throws with both counts', () => {
    expect(() => assertLedgerBitcoinInputLimit(LEDGER_BITCOIN_MAX_INPUTS + 1)).toThrow(
      'Ledger can sign at most 50 inputs per transaction, but this transaction has 51'
    );
  });
});

describe(isPsbtOverLedgerInputLimit.name, () => {
  const overLimit = LEDGER_BITCOIN_MAX_INPUTS + 1;

  it('flags a ledger psbt above the input limit', () => {
    expect(
      isPsbtOverLedgerInputLimit({
        walletType: 'ledger',
        inputCount: overLimit,
        isBondProposal: false,
      })
    ).toBe(true);
  });

  it('allows a ledger psbt at the input limit', () => {
    expect(
      isPsbtOverLedgerInputLimit({
        walletType: 'ledger',
        inputCount: LEDGER_BITCOIN_MAX_INPUTS,
        isBondProposal: false,
      })
    ).toBe(false);
  });

  it('allows a ledger bond proposal above the input limit because the device does not sign it', () => {
    expect(
      isPsbtOverLedgerInputLimit({
        walletType: 'ledger',
        inputCount: overLimit,
        isBondProposal: true,
      })
    ).toBe(false);
  });

  it('allows a software wallet psbt above the input limit', () => {
    expect(
      isPsbtOverLedgerInputLimit({
        walletType: 'software',
        inputCount: overLimit,
        isBondProposal: false,
      })
    ).toBe(false);
  });
});
