import { useLocation, useNavigate, useParams } from 'react-router';

import { type StacksTransactionWire } from '@stacks/transactions';
import { useMutation } from '@tanstack/react-query';
import { SendCryptoAssetSelectors } from '@tests/selectors/send.selectors';

import { createSubmitSbtcSponsoredTransactionMutationConfig } from '@leather.io/queries';
import type { SbtcSponsoredTransferDetails } from '@leather.io/stacks';
import { Callout } from '@leather.io/ui';
import { createMoney, sumMoney } from '@leather.io/utils';

import { logger } from '@shared/logger';
import { RouteUrls } from '@shared/route-urls';

import { formatCurrency } from '@app/common/currency-formatter';
import { useRefreshAllAccountData } from '@app/common/hooks/account/use-refresh-all-account-data';
import { getNonceFromStacksTransaction } from '@app/common/transactions/stacks/transaction.utils';
import { Content, Page } from '@app/components/layout';
import { PageHeader } from '@app/features/container/headers/page.header';
import {
  getSbtcSponsorshipErrorMessage,
  isSbtcSponsorshipQuoteExpired,
  isSbtcSponsorshipRequoteError,
  sbtcFeeCurrency,
} from '@app/features/sbtc-sponsorship/sbtc-sponsorship.utils';
import { SponsoredFeeBadge } from '@app/features/sbtc-sponsorship/sponsored-fee-badge';
import { useBuildSbtcSponsoredTransfer } from '@app/features/sbtc-sponsorship/use-build-sbtc-sponsored-transfer';
import { useFetchFreshSbtcSponsorshipQuote } from '@app/features/sbtc-sponsorship/use-sbtc-sponsorship-quote';
import { useNextNonce } from '@app/query/stacks/nonce/account-nonces.hooks';
import { useCurrentStacksAccountAddress } from '@app/store/accounts/blockchain/stacks/stacks-account.hooks';
import { useSignStacksTransaction } from '@app/store/transactions/transaction.hooks';

import type {
  SbtcSponsorshipRouteState,
  StacksConfirmationRouteState,
} from '../../hooks/use-send-form-navigate';
import { SendFormConfirmationLayout } from '../send-form-confirmation.layout';

const timeForApiToUpdate = 250;

interface SbtcSponsoredSendFormConfirmationProps {
  routeState: StacksConfirmationRouteState;
  sponsorship: SbtcSponsorshipRouteState;
  tx: StacksTransactionWire;
  details: SbtcSponsoredTransferDetails;
  decimals: number;
}
export function SbtcSponsoredSendFormConfirmation({
  routeState,
  sponsorship,
  tx,
  details,
  decimals,
}: SbtcSponsoredSendFormConfirmationProps) {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { symbol = sbtcFeeCurrency } = useParams();
  const signStacksTransaction = useSignStacksTransaction();
  const buildSbtcSponsoredTransfer = useBuildSbtcSponsoredTransfer();
  const fetchFreshQuote = useFetchFreshSbtcSponsorshipQuote();
  const { refetch: refetchNextNonce } = useNextNonce(useCurrentStacksAccountAddress());
  const refreshAccountData = useRefreshAllAccountData();
  const submitMutation = useMutation(createSubmitSbtcSponsoredTransactionMutationConfig());

  const amount = createMoney(details.amount, sbtcFeeCurrency, decimals);
  const fee = createMoney(details.fee, sbtcFeeCurrency, decimals);

  function toBroadcastError(error: unknown) {
    void navigate(`${pathname}/${RouteUrls.BroadcastError}`, {
      state: { message: getSbtcSponsorshipErrorMessage(error) },
    });
  }

  async function requote() {
    const [quote, { data: nextNonce }] = await Promise.all([fetchFreshQuote(), refetchNextNonce()]);
    if (nextNonce?.nonce === undefined) throw new Error('Unable to fetch the account nonce');
    const requotedTx = await buildSbtcSponsoredTransfer({
      assetId: sponsorship.assetId,
      decimals,
      formValues: sponsorship.formValues,
      quote,
      stxFeeMicro: sponsorship.stxFeeMicro,
      nonce: nextNonce.nonce,
    });
    void navigate(pathname, {
      replace: true,
      state: {
        ...routeState,
        tx: requotedTx.serialize(),
        sponsorship: { ...sponsorship, quoteId: quote.quoteId, expiresAt: quote.expiresAt },
        showRequoteCallout: true,
      } satisfies StacksConfirmationRouteState,
    });
  }

  async function submit() {
    const signedTx = await signStacksTransaction(tx);
    if (!signedTx) return;
    try {
      const { txid, transaction } = await submitMutation.mutateAsync({
        quoteId: sponsorship.quoteId,
        transaction: signedTx.serialize(),
      });
      void navigate(
        RouteUrls.SentStxTxSummary.replace(':symbol', symbol.toLowerCase()).replace(':txid', txid),
        { state: { tx: transaction } }
      );
      void refreshAccountData(timeForApiToUpdate);
    } catch (error) {
      if (!isSbtcSponsorshipRequoteError(error)) throw error;
      await requote();
    }
  }

  async function onConfirm() {
    try {
      if (isSbtcSponsorshipQuoteExpired(sponsorship.expiresAt)) return await requote();
      return await submit();
    } catch (error) {
      logger.error('Failed to submit the sponsored sBTC transfer', error);
      return toBroadcastError(error);
    }
  }

  return (
    <>
      <PageHeader title="Review" />
      <Content>
        <Page>
          <SendFormConfirmationLayout
            symbol={sbtcFeeCurrency}
            txValue={amount}
            totalSpend={formatCurrency(sumMoney([amount, fee]))}
            sendingValue={formatCurrency(amount)}
            fee={fee}
            feeWarningTooltip={<SponsoredFeeBadge />}
            recipient={details.recipient}
            nonce={getNonceFromStacksTransaction(tx).toString()}
            memoDisplayText={details.memo || 'No memo'}
            isLoading={submitMutation.isPending}
            onBroadcastTransaction={() => void onConfirm()}
            callout={
              routeState.showRequoteCallout ? (
                <Callout
                  variant="info"
                  title="Fee quote updated"
                  px="space.03"
                  mb="space.05"
                  data-testid={SendCryptoAssetSelectors.SbtcFeeRequoteCallout}
                >
                  The sBTC fee was refreshed. Review the updated total and confirm again.
                </Callout>
              ) : undefined
            }
          />
        </Page>
      </Content>
    </>
  );
}
