import { HStack, Stack, styled } from 'leather-styles/jsx';

import type { Money } from '@leather.io/models';
import { Approver, Caption, SkeletonLoader } from '@leather.io/ui';

import { formatCurrency } from '@app/common/currency-formatter';
import { useCalculateMaxBitcoinSpend } from '@app/common/hooks/balance/use-calculate-max-spend';
import { useBitcoinFeeRates } from '@app/query/bitcoin/fees/bitcoin-fee-rates.hooks';

import { useRpcSendTransferContext } from './rpc-send-transfer.context';

interface AmountRowProps {
  amount: Money;
  fiatAmount: Money;
  isLoading?: boolean;
  label: string;
}
function AmountRow({ amount, fiatAmount, isLoading = false, label }: AmountRowProps) {
  return (
    <HStack justify="space-between" alignItems="flex-start" mb="space.03">
      <styled.span textStyle="label.02">{label}</styled.span>
      <SkeletonLoader isLoading={isLoading} height="40px" width="96px">
        <Stack alignItems="flex-end" gap="space.01">
          <styled.span textStyle="label.02">{formatCurrency(amount)}</styled.span>
          <Caption>{formatCurrency(fiatAmount)}</Caption>
        </Stack>
      </SkeletonLoader>
    </HStack>
  );
}

interface RpcSendTransferInsufficientFundsProps {
  convertToFiatAmount(value: Money): Money;
}
export function RpcSendTransferInsufficientFunds({
  convertToFiatAmount,
}: RpcSendTransferInsufficientFundsProps) {
  const { amount, recipients, utxos } = useRpcSendTransferContext();
  const { isLoading: isLoadingFeeRates } = useBitcoinFeeRates();
  const calcMaxSpend = useCalculateMaxBitcoinSpend();
  const availableToSend = calcMaxSpend(recipients[0]?.address, utxos).amount;

  return (
    <Approver.Section>
      <AmountRow
        label="Requested amount"
        amount={amount}
        fiatAmount={convertToFiatAmount(amount)}
      />
      <AmountRow
        label="Available to send"
        amount={availableToSend}
        fiatAmount={convertToFiatAmount(availableToSend)}
        isLoading={isLoadingFeeRates}
      />
    </Approver.Section>
  );
}
