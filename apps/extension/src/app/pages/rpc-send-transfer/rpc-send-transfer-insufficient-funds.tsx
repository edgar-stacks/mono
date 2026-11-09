import { HStack, Stack, styled } from 'leather-styles/jsx';

import type { Money } from '@leather.io/models';
import { Approver, Caption, SkeletonLoader } from '@leather.io/ui';

import { formatCurrency } from '@app/common/currency-formatter';
import { useCalculateMaxBitcoinSpend } from '@app/common/hooks/balance/use-calculate-max-spend';
import { useConvertCryptoCurrencyToFiatAmount } from '@app/common/hooks/use-convert-to-fiat-amount';
import { useBitcoinFeeRates } from '@app/query/bitcoin/fees/bitcoin-fee-rates.hooks';

import { useRpcSendTransferContext } from './rpc-send-transfer.context';

interface InsufficientFundsAmountRowProps {
  amount: Money;
  fiatAmount: Money;
  isLoading?: boolean;
  label: string;
}
function InsufficientFundsAmountRow({
  amount,
  fiatAmount,
  isLoading = false,
  label,
}: InsufficientFundsAmountRowProps) {
  return (
    <HStack alignItems="flex-start" justifyContent="space-between" gap="space.03">
      <styled.span textStyle="label.02">{label}</styled.span>
      <SkeletonLoader isLoading={isLoading} height="40px" width="96px">
        <Stack alignItems="flex-end" gap="space.00">
          <styled.span textStyle="label.02">
            {formatCurrency(amount, { preset: 'pad-decimals' })}
          </styled.span>
          <Caption>{formatCurrency(fiatAmount)}</Caption>
        </Stack>
      </SkeletonLoader>
    </HStack>
  );
}

export function RpcSendTransferInsufficientFunds() {
  const { amount, recipients, utxos } = useRpcSendTransferContext();
  const { isLoading: isLoadingFeeRates } = useBitcoinFeeRates();
  const calcMaxSpend = useCalculateMaxBitcoinSpend();
  const convertToFiatAmount = useConvertCryptoCurrencyToFiatAmount('BTC');

  const availableToSend = calcMaxSpend(recipients[0]?.address, utxos).amount;

  return (
    <Approver.Section>
      <Stack gap="space.04">
        <InsufficientFundsAmountRow
          label="Requested amount"
          amount={amount}
          fiatAmount={convertToFiatAmount(amount)}
        />
        <InsufficientFundsAmountRow
          label="Available to send"
          amount={availableToSend}
          fiatAmount={convertToFiatAmount(availableToSend)}
          isLoading={isLoadingFeeRates}
        />
      </Stack>
    </Approver.Section>
  );
}
