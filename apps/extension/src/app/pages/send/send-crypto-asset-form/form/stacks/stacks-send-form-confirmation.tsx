import { useCallback, useRef } from 'react';
import { useParams } from 'react-router';

import {
  type StacksTransactionWire,
  deserializeTransaction,
  isTokenTransferPayload,
} from '@stacks/transactions';
import { Box, Stack } from 'leather-styles/jsx';

import type { AccountId } from '@leather.io/models';
import { BasicTooltip, InfoCircleIcon } from '@leather.io/ui';
import { baseCurrencyAmountInQuote, convertAmountToBaseUnit, sumMoney } from '@leather.io/utils';

import { formatCurrency } from '@app/common/currency-formatter';
import { useRouteState } from '@app/common/hooks/use-route-state';
import {
  getNonceFromStacksTransaction,
  getRecipientFromStacksTransaction,
  getSip10MemoDisplayText,
  getSip10TransferAmount,
  getSip10TransferPayload,
  getStacksTransactionFee,
  getTokenTransferAmount,
  getTokenTransferMemoDisplayText,
  isNonSequentialMultisigTransaction,
} from '@app/common/transactions/stacks/transaction.utils';
import { useStacksBroadcastTransaction } from '@app/common/transactions/stacks/use-stacks-broadcast-transaction';
import { Content, Page } from '@app/components/layout';
import { PageHeader } from '@app/features/container/headers/page.header';
import { isLedgerSigningCancelledError } from '@app/features/ledger/flow/unwrap-ledger-signing-outcome';
import { useToast } from '@app/features/toasts/use-toast';
import { useCryptoCurrencyMarketData } from '@app/query/common/market-data/market-data.hooks';
import { useStacksRotationTargetAccount } from '@app/store/accounts/blockchain/stacks/stacks-account.hooks';
import { useSignStacksTransaction } from '@app/store/transactions/transaction.hooks';

import type { ProposalSentSummaryState } from '../../../sent-summary/proposal-sent-summary';
import { stacksConfirmationRouteStateSchema } from '../../hooks/use-send-form-navigate';
import { SendFormConfirmationLayout } from '../send-form-confirmation.layout';
import { StxRotationDetails } from './stx-rotation-details';
import { useBroadcastRotationTransaction } from './use-broadcast-rotation-transaction';
import { useProposeStacksSendTransaction } from './use-propose-stacks-send-transaction';

const signingCancelled = 'cancelled';
const signingFailed = 'failed';

interface PendingRotation {
  signedRotationTx: StacksTransactionWire;
  targetAccountId: AccountId;
}

export function StacksSendFormConfirmation() {
  const {
    tx: txHex,
    decimals,
    showFeeChangeWarning = false,
    rotationTx: rotationTxHex,
  } = useRouteState(stacksConfirmationRouteStateSchema);
  const tokenMarketData = useCryptoCurrencyMarketData('STX');
  const toast = useToast();

  const { symbol = 'STX' } = useParams();

  const signStacksTransaction = useSignStacksTransaction();
  const rotationTargetAccount = useStacksRotationTargetAccount();
  const broadcastRotationTransaction = useBroadcastRotationTransaction();
  const pendingRotationRef = useRef<PendingRotation | null>(null);

  const onBroadcastSuccess = useCallback(() => {
    const pendingRotation = pendingRotationRef.current;
    if (!pendingRotation) return;
    pendingRotationRef.current = null;
    void broadcastRotationTransaction(
      pendingRotation.signedRotationTx,
      pendingRotation.targetAccountId
    );
  }, [broadcastRotationTransaction]);

  const { stacksBroadcastTransaction, stacksBroadcastSignedTransaction, isBroadcasting } =
    useStacksBroadcastTransaction({
      token: symbol.toUpperCase(),
      redirectToSuccessPage: true,
      onBroadcastSuccess,
    });
  const { proposeSendTransaction, isProposing } = useProposeStacksSendTransaction();

  const tx = deserializeTransaction(txHex);
  const rotationTx = rotationTxHex ? deserializeTransaction(rotationTxHex) : null;
  const sip10Payload = getSip10TransferPayload(tx);
  const isMultisigProposal = isNonSequentialMultisigTransaction(tx);

  const feeWarningTooltip = showFeeChangeWarning ? (
    <BasicTooltip
      label="You are using a nonce for this transaction that is already pending. The fee has been increased so that it is exactly high enough to replace the pending transaction with the same nonce."
      side="bottom"
    >
      <Stack>
        <Box>
          <InfoCircleIcon color="ink.text-subdued" variant="small" />
        </Box>
      </Stack>
    </BasicTooltip>
  ) : null;

  function getProposalSummary(): ProposalSentSummaryState | null {
    const base = {
      symbol: symbol.toUpperCase(),
      recipient: getRecipientFromStacksTransaction(tx) ?? '',
      feeRowValue: formatCurrency(getStacksTransactionFee(tx)),
    };
    if (isTokenTransferPayload(tx.payload)) {
      const amount = getTokenTransferAmount(tx.payload);
      return {
        ...base,
        txValue: convertAmountToBaseUnit(amount).toString(),
        txFiatValue: formatCurrency(baseCurrencyAmountInQuote(amount, tokenMarketData)),
        txFiatValueSymbol: tokenMarketData.price.symbol,
        memoDisplayText: getTokenTransferMemoDisplayText(tx.payload) || 'No memo',
      };
    }
    if (sip10Payload) {
      const amount = getSip10TransferAmount(sip10Payload, symbol, decimals);
      return {
        ...base,
        txValue: convertAmountToBaseUnit(amount).toString(),
        memoDisplayText: getSip10MemoDisplayText(sip10Payload) ?? 'No memo',
      };
    }
    return null;
  }

  const proposalSummary = getProposalSummary();

  async function signRotationTransaction(unsignedTx: StacksTransactionWire) {
    try {
      const signedTx = await signStacksTransaction(unsignedTx);
      return signedTx ?? signingCancelled;
    } catch (error) {
      return isLedgerSigningCancelledError(error) ? signingCancelled : signingFailed;
    }
  }

  async function onConfirmRotation(unsignedRotationTx: StacksTransactionWire) {
    if (
      !rotationTargetAccount ||
      getRecipientFromStacksTransaction(unsignedRotationTx) !== rotationTargetAccount.address
    )
      return toast.error('Your accounts changed. Go back and review this transaction again.');

    const signedSendTx = await signRotationTransaction(tx);
    if (signedSendTx === signingCancelled)
      return toast.error('Signing was cancelled. Nothing was sent.');
    if (signedSendTx === signingFailed) return;

    const signedRotationTx = await signRotationTransaction(unsignedRotationTx);
    if (signedRotationTx === signingCancelled)
      return toast.error('Signing was cancelled. Nothing was sent.');
    if (signedRotationTx === signingFailed)
      return toast.error('Unable to sign the second transaction');

    pendingRotationRef.current = {
      signedRotationTx,
      targetAccountId: {
        fingerprint: rotationTargetAccount.fingerprint,
        accountIndex: rotationTargetAccount.accountIndex,
      },
    };
    return stacksBroadcastSignedTransaction(signedSendTx);
  }

  function onConfirmTransaction() {
    if (rotationTx) return void onConfirmRotation(rotationTx);
    if (isMultisigProposal) {
      if (!proposalSummary)
        throw new Error('Unsupported payload for a multisig transaction proposal');
      return proposeSendTransaction(tx, proposalSummary);
    }
    return stacksBroadcastTransaction(tx);
  }

  const sharedProps = {
    symbol: symbol.toUpperCase(),
    onBroadcastTransaction: onConfirmTransaction,
    recipient: getRecipientFromStacksTransaction(tx),
    fee: getStacksTransactionFee(tx),
    nonce: isMultisigProposal ? undefined : getNonceFromStacksTransaction(tx).toString(),
    isLoading: isBroadcasting || isProposing,
    feeWarningTooltip,
    confirmButtonLabel: isMultisigProposal ? 'Propose transaction' : undefined,
  } as const;

  return (
    <>
      <PageHeader title="Review" />
      <Content>
        <Page>
          {isTokenTransferPayload(tx.payload) && (
            <SendFormConfirmationLayout
              txValue={getTokenTransferAmount(tx.payload)}
              txFiatValue={formatCurrency(
                baseCurrencyAmountInQuote(getTokenTransferAmount(tx.payload), tokenMarketData)
              )}
              txFiatValueSymbol={tokenMarketData.price.symbol}
              totalSpend={formatCurrency(
                sumMoney([sharedProps.fee, getTokenTransferAmount(tx.payload)])
              )}
              sendingValue={formatCurrency(getTokenTransferAmount(tx.payload))}
              memoDisplayText={getTokenTransferMemoDisplayText(tx.payload) || 'No memo'}
              additionalContent={rotationTx && <StxRotationDetails rotationTx={rotationTx} />}
              {...sharedProps}
            />
          )}
          {sip10Payload && (
            <SendFormConfirmationLayout
              txValue={getSip10TransferAmount(sip10Payload, symbol, decimals)}
              totalSpend={[
                formatCurrency(getSip10TransferAmount(sip10Payload, symbol, decimals)),
                formatCurrency(sharedProps.fee),
              ].join(' + ')}
              sendingValue={formatCurrency(getSip10TransferAmount(sip10Payload, symbol, decimals))}
              memoDisplayText={getSip10MemoDisplayText(sip10Payload) ?? 'No memo'}
              {...sharedProps}
            />
          )}
        </Page>
      </Content>
    </>
  );
}
