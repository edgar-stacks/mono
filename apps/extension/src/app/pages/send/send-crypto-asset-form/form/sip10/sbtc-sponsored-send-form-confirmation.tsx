import { useMemo, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router';

import { deserializeTransaction } from '@stacks/transactions';

import { BTC_DECIMALS } from '@leather.io/constants';
import { getSbtcSponsoredTransferDetails } from '@leather.io/stacks';
import { Callout } from '@leather.io/ui';
import { createMoney, sumMoney } from '@leather.io/utils';

import { logger } from '@shared/logger';
import { RouteUrls } from '@shared/route-urls';

import { formatCurrency } from '@app/common/currency-formatter';
import { getNonceFromStacksTransaction } from '@app/common/transactions/stacks/transaction.utils';
import { Content, Page } from '@app/components/layout';
import { PageHeader } from '@app/features/container/headers/page.header';
import { SponsoredBadge } from '@app/features/sbtc-sponsorship/components/sponsored-badge';
import {
  getSbtcSponsorshipErrorMessage,
  isSbtcSponsorshipQuoteExpired,
  isSbtcSponsorshipRequoteError,
  sbtcFeeSymbol,
} from '@app/features/sbtc-sponsorship/sbtc-sponsorship.utils';
import { useBuildSbtcSponsoredTransfer } from '@app/features/sbtc-sponsorship/use-build-sbtc-sponsored-transfer';
import { useToast } from '@app/features/toasts/use-toast';
import {
  useFetchSbtcSponsorshipQuote,
  useSubmitSbtcSponsoredTransaction,
} from '@app/query/sbtc/sbtc-sponsorship.hooks';
import { useNextNonce } from '@app/query/stacks/nonce/account-nonces.hooks';
import { useCurrentStacksAccountAddress } from '@app/store/accounts/blockchain/stacks/stacks-account.hooks';
import { useSignStacksTransaction } from '@app/store/transactions/transaction.hooks';

import type {
  SbtcSponsorshipRouteState,
  StacksConfirmationRouteState,
} from '../../hooks/use-send-form-navigate';
import { SendFormConfirmationLayout } from '../send-form-confirmation.layout';

interface SbtcSponsoredSendFormConfirmationProps {
  routeState: StacksConfirmationRouteState;
  sponsorship: SbtcSponsorshipRouteState;
}
export function SbtcSponsoredSendFormConfirmation({
  routeState,
  sponsorship,
}: SbtcSponsoredSendFormConfirmationProps) {
  const { symbol = sbtcFeeSymbol } = useParams();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const toast = useToast();
  const signStacksTransaction = useSignStacksTransaction();
  const submitSponsoredTransaction = useSubmitSbtcSponsoredTransaction();
  const fetchSbtcSponsorshipQuote = useFetchSbtcSponsorshipQuote();
  const buildSbtcSponsoredTransfer = useBuildSbtcSponsoredTransfer();
  const stxAddress = useCurrentStacksAccountAddress();
  const { refetch: refetchNextNonce } = useNextNonce(stxAddress);
  const [isRequoting, setIsRequoting] = useState(false);

  const decimals = routeState.decimals ?? BTC_DECIMALS;
  const tx = useMemo(() => deserializeTransaction(routeState.tx), [routeState.tx]);
  const details = getSbtcSponsoredTransferDetails(tx);

  async function requote() {
    setIsRequoting(true);
    try {
      const [quote, { data: nextNonce }] = await Promise.all([
        fetchSbtcSponsorshipQuote({ forceRefresh: true }),
        refetchNextNonce(),
      ]);
      if (nextNonce?.nonce === undefined) throw new Error('The account nonce is not available yet');
      const { tx: requotedTx } = await buildSbtcSponsoredTransfer({
        assetId: sponsorship.assetId,
        decimals,
        values: sponsorship.values,
        nonce: nextNonce.nonce,
        quote,
        stxFeeMicro: sponsorship.stxFeeMicro,
      });
      void navigate(pathname, {
        replace: true,
        state: {
          ...routeState,
          tx: requotedTx.serialize(),
          sponsorship: {
            ...sponsorship,
            quoteId: quote.quoteId,
            expiresAt: quote.expiresAt,
            quoteRefreshed: true,
          },
        } satisfies StacksConfirmationRouteState,
      });
    } catch (error) {
      logger.error('Failed to refresh the sBTC fee quote', error);
      toast.error(getSbtcSponsorshipErrorMessage(error));
    } finally {
      setIsRequoting(false);
    }
  }

  async function signTransaction() {
    try {
      return await signStacksTransaction(tx);
    } catch (error) {
      logger.error('Failed to sign the sponsored sBTC transfer', error);
      return null;
    }
  }

  async function onConfirm() {
    if (isSbtcSponsorshipQuoteExpired(sponsorship.expiresAt)) return requote();

    const signedTx = await signTransaction();
    if (!signedTx) return;

    try {
      const { txid, transaction } = await submitSponsoredTransaction.mutateAsync({
        quoteId: sponsorship.quoteId,
        transaction: signedTx.serialize(),
      });
      void navigate(
        RouteUrls.SentStxTxSummary.replace(':symbol', symbol.toLowerCase()).replace(':txid', txid),
        { state: { tx: transaction } }
      );
    } catch (error) {
      if (isSbtcSponsorshipRequoteError(error)) return requote();
      logger.error('Failed to submit the sponsored sBTC transfer', error);
      void navigate(`${pathname}/${RouteUrls.BroadcastError}`, {
        state: { message: getSbtcSponsorshipErrorMessage(error) },
      });
    }
  }

  if (!details) return null;

  const amount = createMoney(details.amount, sbtcFeeSymbol, decimals);
  const fee = createMoney(details.fee, sbtcFeeSymbol, decimals);

  return (
    <>
      <PageHeader title="Review" />
      <Content>
        <Page>
          {sponsorship.quoteRefreshed && (
            <Callout variant="info" title="Fee quote updated" mb="space.04">
              The sBTC fee was refreshed. Review the updated total and confirm again.
            </Callout>
          )}
          <SendFormConfirmationLayout
            symbol={sbtcFeeSymbol}
            txValue={amount}
            totalSpend={formatCurrency(sumMoney([amount, fee]))}
            sendingValue={formatCurrency(amount)}
            fee={fee}
            feeWarningTooltip={<SponsoredBadge />}
            recipient={details.recipient}
            nonce={getNonceFromStacksTransaction(tx).toString()}
            memoDisplayText={details.memo || 'No memo'}
            isLoading={submitSponsoredTransaction.isPending || isRequoting}
            onBroadcastTransaction={() => void onConfirm()}
          />
        </Page>
      </Content>
    </>
  );
}
