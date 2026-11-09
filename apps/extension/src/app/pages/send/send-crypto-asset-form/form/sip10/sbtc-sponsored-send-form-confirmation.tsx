import { useState } from 'react';
import { useNavigate } from 'react-router';

import { deserializeTransaction } from '@stacks/transactions';

import { getSbtcSponsoredTransferDetails } from '@leather.io/stacks';
import { Callout } from '@leather.io/ui';
import { createMoney, isNumber, sumMoney } from '@leather.io/utils';

import { logger } from '@shared/logger';
import { RouteUrls } from '@shared/route-urls';

import { formatCurrency } from '@app/common/currency-formatter';
import {
  getNonceFromStacksTransaction,
  stacksTransactionToHex,
} from '@app/common/transactions/stacks/transaction.utils';
import { SponsoredFeeBadge } from '@app/features/sbtc-sponsorship/components/sponsored-fee-badge';
import {
  getSbtcSponsorshipErrorMessage,
  isSbtcSponsorshipQuoteExpired,
  isSbtcSponsorshipRequoteError,
} from '@app/features/sbtc-sponsorship/sbtc-sponsorship.utils';
import {
  useFetchSbtcSponsorshipQuote,
  useGenerateSbtcSponsoredTransferUnsignedTx,
  useSubmitSbtcSponsoredTransfer,
} from '@app/features/sbtc-sponsorship/use-sbtc-sponsorship';
import { useToast } from '@app/features/toasts/use-toast';
import { useNextNonce } from '@app/query/stacks/nonce/account-nonces.hooks';
import { useCurrentStacksAccountAddress } from '@app/store/accounts/blockchain/stacks/stacks-account.hooks';
import { useSignStacksTransaction } from '@app/store/transactions/transaction.hooks';

import {
  type SbtcSponsorshipRouteState,
  useSendFormNavigate,
} from '../../hooks/use-send-form-navigate';
import { SendFormConfirmationLayout } from '../send-form-confirmation.layout';

interface SbtcSponsoredSendFormConfirmationProps {
  txHex: string;
  symbol: string;
  token: string;
  decimals: number;
  sbtcSponsorship: SbtcSponsorshipRouteState;
  isQuoteUpdated: boolean;
}
export function SbtcSponsoredSendFormConfirmation({
  txHex,
  symbol,
  token,
  decimals,
  sbtcSponsorship,
  isQuoteUpdated,
}: SbtcSponsoredSendFormConfirmationProps) {
  const navigate = useNavigate();
  const toast = useToast();
  const sendFormNavigate = useSendFormNavigate();
  const stxAddress = useCurrentStacksAccountAddress();
  const nextNonce = useNextNonce(stxAddress);
  const signStacksTransaction = useSignStacksTransaction();
  const fetchSbtcSponsorshipQuote = useFetchSbtcSponsorshipQuote();
  const generateSbtcSponsoredTx = useGenerateSbtcSponsoredTransferUnsignedTx();
  const { mutateAsync: submitSponsoredTransfer } = useSubmitSbtcSponsoredTransfer();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const tx = deserializeTransaction(txHex);
  const details = getSbtcSponsoredTransferDetails(tx);
  if (!details) return null;

  const amount = createMoney(details.amount, symbol, decimals);
  const fee = createMoney(details.fee, symbol, decimals);

  async function requote() {
    try {
      const quote = await fetchSbtcSponsorshipQuote({ forceRefresh: true });
      const { data: freshNonce } = await nextNonce.refetch();
      if (!isNumber(freshNonce?.nonce)) throw new Error('Unable to determine the account nonce');
      const updatedTx = await generateSbtcSponsoredTx({
        assetId: sbtcSponsorship.assetId,
        decimals,
        values: sbtcSponsorship.values,
        nonce: freshNonce.nonce,
        quote,
        stxFeeMicro: sbtcSponsorship.stxFeeMicro,
      });
      if (!updatedTx) return;
      void sendFormNavigate.toUpdatedSbtcSponsoredConfirmation({
        decimals,
        name: token,
        tx: updatedTx,
        sbtcSponsorship: {
          ...sbtcSponsorship,
          quoteId: quote.quoteId,
          expiresAt: quote.expiresAt,
        },
      });
    } catch (error) {
      logger.error('Failed to refresh the sBTC fee quote', error);
      toast.error(getSbtcSponsorshipErrorMessage(error));
    }
  }

  async function signTransaction() {
    try {
      return await signStacksTransaction(tx);
    } catch (error) {
      logger.error('Failed to sign the sponsored sBTC transfer', error);
      return undefined;
    }
  }

  async function onConfirm() {
    setIsSubmitting(true);
    try {
      if (isSbtcSponsorshipQuoteExpired(sbtcSponsorship.expiresAt)) return await requote();

      const signedTx = await signTransaction();
      if (!signedTx) return;

      const response = await submitSponsoredTransfer({
        quoteId: sbtcSponsorship.quoteId,
        transaction: stacksTransactionToHex(signedTx),
      });
      void navigate(
        RouteUrls.SentStxTxSummary.replace(':symbol', symbol.toLowerCase()).replace(
          ':txid',
          response.txid
        ),
        { state: { tx: response.transaction, decimals } }
      );
    } catch (error) {
      if (isSbtcSponsorshipRequoteError(error)) return await requote();
      logger.error('Failed to submit the sponsored sBTC transfer', error);
      void navigate(RouteUrls.BroadcastError, {
        state: { message: getSbtcSponsorshipErrorMessage(error) },
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <SendFormConfirmationLayout
      symbol={symbol}
      txValue={amount}
      totalSpend={formatCurrency(sumMoney([amount, fee]))}
      sendingValue={formatCurrency(amount)}
      fee={fee}
      feeWarningTooltip={<SponsoredFeeBadge />}
      recipient={details.recipient}
      nonce={getNonceFromStacksTransaction(tx).toString()}
      memoDisplayText={details.memo || 'No memo'}
      isLoading={isSubmitting}
      notice={
        isQuoteUpdated ? (
          <Callout variant="info" title="Fee quote updated" px="space.03" mb="space.05">
            The sBTC fee was refreshed. Review the updated total and confirm again.
          </Callout>
        ) : undefined
      }
      onBroadcastTransaction={() => void onConfirm()}
    />
  );
}
