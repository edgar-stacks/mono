import { Suspense } from 'react';
import { useLocation } from 'react-router';

import { ActivitySelectors } from '@tests/selectors/activity.selectors';
import { Formik } from 'formik';
import { Flex, Stack } from 'leather-styles/jsx';

import type { BitcoinTx } from '@leather.io/models';
import { Caption, Sheet, SheetHeader, Spinner } from '@leather.io/ui';
import { sumMoney } from '@leather.io/utils';

import { RouteUrls } from '@shared/route-urls';

import { formatCurrency } from '@app/common/currency-formatter';
import { useRouteState } from '@app/common/hooks/use-route-state';
import { BitcoinCustomFeeInput } from '@app/components/bitcoin-custom-fee/bitcoin-custom-fee-input';
import { BitcoinTransactionItem } from '@app/components/bitcoin-transaction-item/bitcoin-transaction-item';
import { useCurrentBtcBalanceWithFallback } from '@app/query/bitcoin/balance/btc-balance.hooks';

import { TransactionActions } from './components/transaction-actions';
import { useBtcIncreaseFee } from './hooks/use-btc-increase-fee';
import { increaseBtcFeeRouteStateSchema } from './increase-btc-fee-route-state';
import { useCloseTransactionAction } from './use-close-transaction-action';

export function IncreaseBtcFeeSheet() {
  const tx = useRouteState(increaseBtcFeeRouteStateSchema)?.btcTx;
  if (!tx) return <IncreaseBtcFeeUnsupportedSheet />;
  return <IncreaseBtcFeeSheetContent tx={tx} />;
}

function IncreaseBtcFeeUnsupportedSheet() {
  const onClose = useCloseTransactionAction();

  return (
    <Sheet isShowing onClose={onClose} header={<SheetHeader title="Increase fee" />}>
      <Stack gap="space.05" px="space.05" pb="space.05">
        <Caption>This transaction can't be sped up in Leather.</Caption>
      </Stack>
    </Sheet>
  );
}

interface IncreaseBtcFeeSheetContentProps {
  tx: BitcoinTx;
}

function IncreaseBtcFeeSheetContent({ tx }: IncreaseBtcFeeSheetContentProps) {
  const location = useLocation();
  const onClose = useCloseTransactionAction();

  const btcTx = tx;
  const { btc: balance } = useCurrentBtcBalanceWithFallback();
  const { isBroadcasting, sizeInfo, onSubmit, validationSchema, recipients } =
    useBtcIncreaseFee(btcTx);

  const btcBalance = formatCurrency(sumMoney([balance.availableBalance, balance.outboundBalance]));

  const initialFeeRate = `${(tx.fee / sizeInfo.txVBytes).toFixed(0)}`;

  return (
    <>
      <Formik
        initialValues={{ feeRate: initialFeeRate }}
        onSubmit={onSubmit}
        validateOnChange={false}
        validateOnBlur={false}
        validateOnMount={false}
        validationSchema={validationSchema}
      >
        {({ submitForm }) => (
          <>
            <Sheet
              isShowing={location.pathname === RouteUrls.IncreaseBtcFee}
              onClose={onClose}
              header={<SheetHeader title="Increase fee" />}
              footer={
                <TransactionActions
                  isDisabled={isBroadcasting}
                  isBroadcasting={isBroadcasting}
                  onSubmit={() => void submitForm()}
                  onCancel={onClose}
                />
              }
            >
              <Stack gap="space.05" px="space.05" pb="space.05">
                <Suspense
                  fallback={
                    <Flex alignItems="center" justifyContent="center" p="space.06">
                      <Spinner />
                    </Flex>
                  }
                >
                  <Caption>
                    If your transaction is pending for a long time, its fee might not be high enough
                    to be included in a block. Update the fee for a higher value and try again.
                  </Caption>
                  <Stack gap="space.06">
                    {btcTx && <BitcoinTransactionItem transaction={btcTx} />}
                    <Stack gap="space.04">
                      <Stack gap="space.01">
                        <BitcoinCustomFeeInput
                          isSendingMax={false}
                          recipients={recipients}
                          hasInsufficientBalanceError={false}
                          customFeeInitialValue={initialFeeRate}
                        />
                      </Stack>

                      {balance && (
                        <Caption data-testid={ActivitySelectors.TransactionActionBalance}>
                          Balance: {btcBalance}
                        </Caption>
                      )}
                    </Stack>
                  </Stack>
                </Suspense>
              </Stack>
            </Sheet>
          </>
        )}
      </Formik>
    </>
  );
}
