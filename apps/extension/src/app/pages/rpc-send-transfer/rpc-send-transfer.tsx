import { useEffect, useMemo } from 'react';

import { Box } from 'leather-styles/jsx';

import { Approver, BtcAvatarIcon } from '@leather.io/ui';
import { baseCurrencyAmountInQuote, sumMoney } from '@leather.io/utils';

import { analytics } from '@shared/utils/analytics';

import { formatCurrency } from '@app/common/currency-formatter';
import { focusTabAndWindow } from '@app/common/focus-tab';
import { useConvertCryptoCurrencyToFiatAmount } from '@app/common/hooks/use-convert-to-fiat-amount';
import { useSwitchAccountSheet } from '@app/common/switch-account/use-switch-account-sheet-context';
import { AccountBitcoinAddress } from '@app/components/account/account-bitcoin-address';
import { FormError } from '@app/components/form-error';
import { BackgroundOverlay } from '@app/components/loading-overlay';
import { NoBroadcastWarningLabel } from '@app/components/rpc-transaction-request/no-broadcast-warning-label';
import { TransactionActionsTitle } from '@app/components/rpc-transaction-request/transaction-actions-title';
import { TransactionError } from '@app/components/rpc-transaction-request/transaction-error';
import { TransactionHeader } from '@app/components/rpc-transaction-request/transaction-header';
import { TransactionRecipientsLayout } from '@app/components/rpc-transaction-request/transaction-recipients.layout';
import { TransactionWrapper } from '@app/components/rpc-transaction-request/transaction-wrapper';
import { SpendSourcesApproverRows } from '@app/components/spend-sources/spend-sources-approver-rows';
import { SpendSourcesTaprootCallout } from '@app/components/spend-sources/spend-sources-taproot-callout';
import { FeeEditor } from '@app/features/fee-editor/fee-editor';
import {
  type FeesErrorReason,
  useFeeEditorContext,
} from '@app/features/fee-editor/fee-editor.context';
import { SigningAccountCard } from '@app/features/rpc-stacks-transaction-request/signing-account-card/signing-account-card';
import { useBreakOnNonCompliantEntity } from '@app/query/common/compliance-checker/compliance-checker.query';
import { useCurrentAccountId } from '@app/store/accounts/account';
import { useCurrentPolicy } from '@app/store/policy/policy.selectors';

import { RpcSendTransferInsufficientFunds } from './rpc-send-transfer-insufficient-funds';
import { getRpcSendTransferSpendSources } from './rpc-send-transfer-spend-sources';
import { useRpcSendTransferContext } from './rpc-send-transfer.context';
import { useRpcSendTransferActions } from './use-rpc-send-transfer-actions';
import { useRpcSendTransferTx } from './use-rpc-send-transfer-tx';

const feesErrorMessages: Record<FeesErrorReason, string> = {
  'insufficient-funds':
    "This account doesn't have enough funds for this transfer. Switch account or cancel the request.",
  'fee-estimation-failed': 'Unable to estimate network fees for this request',
};

export function RpcSendTransfer() {
  const currentAccount = useCurrentAccountId();
  const policy = useCurrentPolicy();
  const {
    availableBalance,
    feesError,
    isLoadingFees,
    marketData,
    onUserActivatesFeeEditor,
    selectedFee,
  } = useFeeEditorContext();
  const {
    recipients,
    recipientAddresses,
    amount,
    broadcast,
    origin,
    isLoadingBalance,
    tabId,
    utxos,
  } = useRpcSendTransferContext();
  const { toggleSwitchAccount, setAccountFilter } = useSwitchAccountSheet();

  const convertToFiatAmount = useConvertCryptoCurrencyToFiatAmount('BTC');

  useBreakOnNonCompliantEntity('rpc_send_transfer', recipientAddresses);

  useEffect(() => {
    setAccountFilter('bitcoin');
    return () => setAccountFilter('all');
  }, [setAccountFilter]);

  const isInsufficientBalance =
    !isLoadingBalance && availableBalance.amount.isLessThan(amount.amount);
  const isBitcoinPolicy = policy?.chain === 'bitcoin';
  const isSignOnly = !broadcast && !isBitcoinPolicy;
  const generatedTx = useRpcSendTransferTx();
  const unsignedTx = generatedTx.tx;
  const { approverActions, isBroadcasting, isSubmitted } = useRpcSendTransferActions(generatedTx);
  const showOverlay = isBroadcasting || isSubmitted;

  const spendSources = useMemo(() => {
    if (!unsignedTx) return null;
    return getRpcSendTransferSpendSources(unsignedTx, recipients);
  }, [unsignedTx, recipients]);

  const totalFiatValue = useMemo(() => {
    const fee = selectedFee?.txFee;
    if (!fee) return undefined;
    return formatCurrency(baseCurrencyAmountInQuote(sumMoney([amount, fee]), marketData));
  }, [amount, marketData, selectedFee?.txFee]);

  return (
    <TransactionWrapper showOverlay={showOverlay}>
      <Approver requester={origin} width="100%">
        <Box position="relative">
          <BackgroundOverlay show={showOverlay} />
          <TransactionHeader
            title={isSignOnly ? 'Sign transaction' : 'Send token'}
            href="https://leather.io/guides/connect-dapps"
            onPressRequestedByLink={e => {
              e.preventDefault();
              analytics.track('user_clicked_requested_by_link', {
                endpoint: 'sendTransfer',
              });
              focusTabAndWindow(tabId);
            }}
          />
          {isSignOnly && <NoBroadcastWarningLabel origin={origin} />}
          {spendSources && <SpendSourcesTaprootCallout summary={spendSources.summary} />}
          <SigningAccountCard
            address={<AccountBitcoinAddress accountId={currentAccount} />}
            availableBalance={availableBalance}
            balanceCaption={isBitcoinPolicy ? undefined : 'Native SegWit + Taproot'}
            fiatBalance={convertToFiatAmount(availableBalance)}
            isLoadingBalance={isLoadingBalance}
            showPolicyAccount={isBitcoinPolicy}
            onSelectAccount={toggleSwitchAccount}
          />
          <TransactionRecipientsLayout
            title="Bitcoin"
            caption="Bitcoin blockchain"
            avatar={<BtcAvatarIcon />}
            convertToFiatAmount={convertToFiatAmount}
            recipients={recipients}
          />
          {feesError === 'insufficient-funds' && (
            <RpcSendTransferInsufficientFunds
              amount={amount}
              recipients={recipients}
              utxos={utxos}
              convertToFiatAmount={convertToFiatAmount}
            />
          )}
          {!feesError && (
            <FeeEditor.Trigger
              feeType="fee-rate"
              isLoading={isLoadingFees}
              isSponsored={false}
              marketData={marketData}
              onEditFee={onUserActivatesFeeEditor}
              selectedFee={selectedFee}
            />
          )}
        </Box>
        <Approver.Actions actions={approverActions}>
          {feesError ? (
            <FormError text={feesErrorMessages[feesError]} />
          ) : (
            <>
              <TransactionActionsTitle amount={totalFiatValue} isLoading={isLoadingBalance} />
              {spendSources && <SpendSourcesApproverRows breakdown={spendSources.breakdown} />}
              <TransactionError
                isLoading={isLoadingBalance}
                isInsufficientBalance={isInsufficientBalance}
              />
            </>
          )}
        </Approver.Actions>
      </Approver>
    </TransactionWrapper>
  );
}
