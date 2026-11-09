interface CalculateRotationAmountArgs {
  availableBalance: number;
  amount: number;
  feePerTransfer: number;
}
export function calculateRotationAmount({
  availableBalance,
  amount,
  feePerTransfer,
}: CalculateRotationAmountArgs) {
  const numberOfTransfers = 2;
  return availableBalance - amount - numberOfTransfers * feePerTransfer;
}
