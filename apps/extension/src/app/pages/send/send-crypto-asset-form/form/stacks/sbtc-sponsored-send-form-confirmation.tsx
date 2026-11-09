import { useState } from 'react';
import { useNavigate } from 'react-router';

import type { StacksTransactionWire } from '@stacks/transactions';
import BigNumber from 'bignumber.js';

import type { SbtcSponsoredTransferDetails } from '@leather.io/stacks';
import { createMoney } from '@leather.io/utils';

import { logger } from '@shared/logger';
import { RouteUrls } from '@shared/route-urls';
import { analytics } from '@shared/utils/analytics';

import { formatCurrency } from '@app/common/currency-formatter';
import { getNonceFromStacksTransaction } from '@app/common/transactions/stacks/transaction.utils';
import { SbtcFeeRequoteCallout } from '@app/features/sbtc-sponsorship/components/sbtc-fee-requote-callout';
import {
  convertStxFeeToSbtcFee,
  getSbtcSponsorshipErrorMessage,
  isSbtcSponsorshipQuoteExpired,
  isSbtcSponsorshipRequoteError,
  sbtcFeeSymbol,
} from '@app/features/sbtc-sponsorship/sbtc-sponsorship.utils';
import { useGenerateSbtcSponsoredTransferUnsignedTx } from '@app/features/sbtc-sponsorship/use-generate-sbtc-sponsored-transfer';
import {
  useFetchFreshSbtcSponsorshipQuote,
  useSubmitSbtcSponsoredTransaction,
} from '@app/query/sbtc/sbtc-sponsorship.query';
import { useNextNonce } from '@app/query/stacks/nonce/account-nonces.hooks';
import { useCurrentStacksAccountAddress } from '@app/store/accounts/blockchain/stacks/stacks-account.hooks';
import { useSignStacksTransaction } from '@app/store/transactions/transaction.hooks';

import {
  type SbtcSponsorshipRouteState,
  useSendFormNavigate,
} from '../../hooks/use-send-form-navigate';
import { SendFormConfirmationLayout } from '../send-form-confirmation.layout';

interface SbtcSponsoredSendFormConfirmationProps {
  tx: StacksTransactionWire;
  details: SbtcSponsoredTransferDetails;
  sponsorship: SbtcSponsorshipRouteState;
  decimals: number;
  symbol: string;
  token?: string;
  showRequoteCallout: boolean;
}
export function SbtcSponsoredSendFormConfirmation({
  tx,
  details,
  sponsorship,
  decimals,
  symbol,
  token,
  showRequoteCallout,
}: SbtcSponsoredSendFormConfirmationProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();
  const sendFormNavigate = useSendFormNavigate();
  const signStacksTransaction = useSignStacksTransaction();
  const fetchFreshQuote = useFetchFreshSbtcSponsorshipQuote();
  const { mutateAsync: submitSponsoredTransaction } = useSubmitSbtcSponsoredTransaction();
  const generateSponsoredTx = useGenerateSbtcSponsoredTransferUnsignedTx();
  const { refetch: refetchNextNonce } = useNextNonce(useCurrentStacksAccountAddress());

  function toSbtcMoney(value: bigint) {
    return createMoney(new BigNumber(value.toString()), sbtcFeeSymbol, decimals);
  }
  const amount = toSbtcMoney(details.amount);

  function showError(error: unknown) {
    void navigate(RouteUrls.BroadcastError, {
      state: { message: getSbtcSponsorshipErrorMessage(error) },
    });
  }

  async function requote() {
    const quote = await fetchFreshQuote();
    const { data: nextNonce } = await refetchNextNonce();
    if (nextNonce?.nonce === undefined) throw new Error('Unable to fetch the account nonce');

    const requotedTx = await generateSponsoredTx({
      assetId: sponsorship.assetId,
      decimals,
      values: sponsorship.formValues,
      feeRecipient: quote.feeRecipientPrincipal,
      sbtcFee: convertStxFeeToSbtcFee(sponsorship.stxFeeMicro, quote),
      stxFeeMicro: sponsorship.stxFeeMicro,
      nonce: nextNonce.nonce,
    });
    if (!requotedTx) throw new Error('Unable to generate the sponsored sBTC transfer');

    await sendFormNavigate.toRequotedStacksSip10Confirmation({
      decimals,
      name: token,
      tx: requotedTx,
      sponsorship: { ...sponsorship, quoteId: quote.quoteId, expiresAt: quote.expiresAt },
    });
  }

  async function submit() {
    if (isSbtcSponsorshipQuoteExpired(sponsorship)) return requote();

    const signedTx = await signStacksTransaction(tx);
    if (!signedTx) return;

    try {
      const result = await submitSponsoredTransaction({
        quoteId: sponsorship.quoteId,
        transaction: signedTx.serialize(),
      });
      analytics.track('broadcast_transaction', { symbol: 'sbtc' });
      await navigate(
        RouteUrls.SentStxTxSummary.replace(':symbol', symbol.toLowerCase()).replace(
          ':txid',
          result.txid
        ),
        { state: { tx: result.transaction } }
      );
    } catch (error) {
      if (isSbtcSponsorshipRequoteError(error)) return requote();
      throw error;
    }
  }

  async function onConfirm() {
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      await submit();
    } catch (error) {
      logger.error('Failed to submit sponsored sBTC transaction', error);
      showError(error);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <SendFormConfirmationLayout
      symbol={sbtcFeeSymbol}
      txValue={amount}
      recipient={details.recipient}
      totalSpend={formatCurrency(toSbtcMoney(details.total))}
      sendingValue={formatCurrency(amount)}
      fee={toSbtcMoney(details.fee)}
      memoDisplayText={details.memo || 'No memo'}
      nonce={getNonceFromStacksTransaction(tx).toString()}
      isLoading={isSubmitting}
      callout={showRequoteCallout ? <SbtcFeeRequoteCallout /> : undefined}
      onBroadcastTransaction={() => void onConfirm()}
    />
  );
}
