import { Stack, styled } from 'leather-styles/jsx';

import type { Money, OwnedUtxo } from '@leather.io/models';
import { Approver, ItemLayout, SkeletonLoader } from '@leather.io/ui';

import type { TransferRecipient } from '@shared/models/form.model';

import { formatCurrency } from '@app/common/currency-formatter';
import { useCalculateMaxBitcoinSpend } from '@app/common/hooks/balance/use-calculate-max-spend';
import { useBitcoinFeeRates } from '@app/query/bitcoin/fees/bitcoin-fee-rates.hooks';

interface InsufficientFundsRowProps {
  title: string;
  value: Money;
  fiatValue: Money;
  isLoading?: boolean;
}
function InsufficientFundsRow({
  title,
  value,
  fiatValue,
  isLoading = false,
}: InsufficientFundsRowProps) {
  return (
    <ItemLayout
      titleLeft={title}
      captionLeft={null}
      titleRight={
        <SkeletonLoader isLoading={isLoading} width="96px">
          <styled.span textStyle="label.02">
            {formatCurrency(value, { preset: 'pad-decimals' })}
          </styled.span>
        </SkeletonLoader>
      }
      captionRight={
        <SkeletonLoader isLoading={isLoading} width="48px">
          <styled.span textStyle="caption.01">{formatCurrency(fiatValue)}</styled.span>
        </SkeletonLoader>
      }
    />
  );
}

interface RpcSendTransferInsufficientFundsProps {
  amount: Money;
  recipients: TransferRecipient[];
  utxos: OwnedUtxo[];
  convertToFiatAmount(value: Money): Money;
}
export function RpcSendTransferInsufficientFunds({
  amount,
  recipients,
  utxos,
  convertToFiatAmount,
}: RpcSendTransferInsufficientFundsProps) {
  const { isLoading: isLoadingFeeRates } = useBitcoinFeeRates();
  const calculateMaxBitcoinSpend = useCalculateMaxBitcoinSpend();
  const availableToSend = calculateMaxBitcoinSpend(recipients.at(0)?.address, utxos).amount;

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
