import { Flex, Stack, styled } from 'leather-styles/jsx';

import type { Money } from '@leather.io/models';
import { Approver, Caption, SkeletonLoader } from '@leather.io/ui';

import { formatCurrency } from '@app/common/currency-formatter';
import { useCalculateMaxBitcoinSpend } from '@app/common/hooks/balance/use-calculate-max-spend';
import { useConvertCryptoCurrencyToFiatAmount } from '@app/common/hooks/use-convert-to-fiat-amount';
import { useBitcoinFeeRates } from '@app/query/bitcoin/fees/bitcoin-fee-rates.hooks';

import { useRpcSendTransferContext } from './rpc-send-transfer.context';

interface InsufficientFundsRowProps {
  fiatValue: Money;
  isLoading?: boolean;
  title: string;
  value: Money;
}
function InsufficientFundsRow({
  fiatValue,
  isLoading = false,
  title,
  value,
}: InsufficientFundsRowProps) {
  return (
    <Flex justifyContent="space-between" gap="space.03">
      <styled.span textStyle="label.02">{title}</styled.span>
      <SkeletonLoader isLoading={isLoading} width="96px">
        <Stack alignItems="flex-end" gap="0">
          <styled.span textStyle="label.02">
            {formatCurrency(value, { preset: 'pad-decimals' })}
          </styled.span>
          <Caption>{formatCurrency(fiatValue)}</Caption>
        </Stack>
      </SkeletonLoader>
    </Flex>
  );
}

export function RpcSendTransferInsufficientFunds() {
  const { amount, recipients, utxos } = useRpcSendTransferContext();
  const convertToFiatAmount = useConvertCryptoCurrencyToFiatAmount('BTC');
  const { isLoading: isLoadingFeeRates } = useBitcoinFeeRates();
  const calculateMaxSpend = useCalculateMaxBitcoinSpend();
  const availableToSend = calculateMaxSpend(recipients[0]?.address, utxos).amount;

  return (
    <Approver.Section>
      <Stack gap="space.03" pb="space.03">
        <InsufficientFundsRow
          title="Requested amount"
          value={amount}
          fiatValue={convertToFiatAmount(amount)}
        />
        <InsufficientFundsRow
          title="Available to send"
          value={availableToSend}
          fiatValue={convertToFiatAmount(availableToSend)}
          isLoading={isLoadingFeeRates}
        />
      </Stack>
    </Approver.Section>
  );
}
