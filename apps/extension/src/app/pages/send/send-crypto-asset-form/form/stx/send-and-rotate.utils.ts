import BigNumber from 'bignumber.js';

const rotationTransferCount = 2;

interface CalculateRotationAmountArgs {
  available: BigNumber.Value;
  amount: BigNumber.Value;
  feePerTransfer: BigNumber.Value;
}
export function calculateRotationAmount({
  available,
  amount,
  feePerTransfer,
}: CalculateRotationAmountArgs) {
  return new BigNumber(available)
    .minus(amount)
    .minus(new BigNumber(feePerTransfer).multipliedBy(rotationTransferCount));
}

interface PendingTransactionNonce {
  sender: { nonce: number };
}
export function hasPendingTransactionAtNonce(
  pendingTransactions: PendingTransactionNonce[],
  nonce: number
) {
  return pendingTransactions.some(tx => tx.sender.nonce === nonce);
}
