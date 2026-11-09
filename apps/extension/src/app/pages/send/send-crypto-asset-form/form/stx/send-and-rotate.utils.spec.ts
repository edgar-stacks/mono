import { calculateRotationAmount, hasPendingTransactionAtNonce } from './send-and-rotate.utils';

describe(calculateRotationAmount.name, () => {
  it('returns what is left after the send and both fees', () => {
    expect(
      calculateRotationAmount({
        available: 1000000,
        amount: 400000,
        feePerTransfer: 3000,
      }).toNumber()
    ).toBe(594000);
  });

  it('returns a non-positive amount when nothing is left to move', () => {
    expect(
      calculateRotationAmount({ available: 10000, amount: 4000, feePerTransfer: 3000 }).toNumber()
    ).toBeLessThanOrEqual(0);
  });
});

describe(hasPendingTransactionAtNonce.name, () => {
  const pendingTransactions = [{ sender: { nonce: 5 } }, { sender: { nonce: 6 } }];

  it('returns true when a pending transaction uses the nonce', () => {
    expect(hasPendingTransactionAtNonce(pendingTransactions, 5)).toBe(true);
  });

  it('returns false when no pending transaction uses the nonce', () => {
    expect(hasPendingTransactionAtNonce(pendingTransactions, 7)).toBe(false);
  });

  it('returns false when there are no pending transactions', () => {
    expect(hasPendingTransactionAtNonce([], 5)).toBe(false);
  });
});
