import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router';

import { deserializeTransaction } from '@stacks/transactions';
import { SendCryptoAssetSelectors } from '@tests/selectors/send.selectors';

import { getSbtcSponsoredTransferDetails } from '@leather.io/stacks';
import { Callout } from '@leather.io/ui';
import { createMoney, sumMoney } from '@leather.io/utils';

import { logger } from '@shared/logger';
import { RouteUrls } from '@shared/route-urls';

import { formatCurrency } from '@app/common/currency-formatter';
import { Content, Page } from '@app/components/layout';
import { PageHeader } from '@app/features/container/headers/page.header';
import {
  convertStxFeeToSbtcFeeSats,
  getSbtcSponsorshipErrorMessage,
  isSbtcQuoteExpired,
  isSbtcRequoteError,
  sbtcDecimals,
  sbtcFeeCurrency,
} from '@app/features/sbtc-sponsorship/sbtc-sponsorship.utils';
import { useGenerateSbtcSponsoredTransferUnsignedTx } from '@app/features/sbtc-sponsorship/use-generate-sbtc-sponsored-transfer';
import { useSbtcSponsorshipNetwork } from '@app/features/sbtc-sponsorship/use-sbtc-sponsorship';
import { useUserSettings } from '@app/hooks/use-user-settings';
import {
  fetchFreshSbtcSponsorshipQuote,
  useSubmitSbtcSponsoredTransactionMutation,
} from '@app/query/sbtc/sbtc-sponsorship.query';
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
  symbol: string;
}
export function SbtcSponsoredSendFormConfirmation({
  routeState,
  sponsorship,
  symbol,
}: SbtcSponsoredSendFormConfirmationProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const settings = useUserSettings();
  const network = useSbtcSponsorshipNetwork();
  const stxAddress = useCurrentStacksAccountAddress();
  const { refetch: refetchNonce } = useNextNonce(stxAddress);
  const signStacksTransaction = useSignStacksTransaction();
  const generateSponsoredTx = useGenerateSbtcSponsoredTransferUnsignedTx();
  const { mutateAsync: submitSponsoredTransaction } = useSubmitSbtcSponsoredTransactionMutation();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const tx = deserializeTransaction(routeState.tx);
  const details = getSbtcSponsoredTransferDetails(tx);
  if (!details) {
    logger.error('Sponsored sBTC confirmation received an unexpected transaction');
    return null;
  }

  const decimals = routeState.decimals ?? sbtcDecimals;
  const amount = createMoney(details.amount, symbol, decimals);
  const fee = createMoney(details.fee, symbol, decimals);
  const feeDisplay = createMoney(details.fee, sbtcFeeCurrency, sbtcDecimals);

  async function requote() {
    const { data: nextNonce } = await refetchNonce();
    const nonce = nextNonce?.nonce;
    if (nonce === undefined) throw new Error('Unable to refresh the account nonce');
    const quote = await fetchFreshSbtcSponsorshipQuote(
      { network, sender: stxAddress, nonce },
      settings
    );
    const requotedTx = await generateSponsoredTx({
      assetId: sponsorship.assetId,
      values: sponsorship.formValues,
      feeRecipient: quote.feeRecipientPrincipal,
      feeSats: convertStxFeeToSbtcFeeSats({ stxFeeMicro: sponsorship.stxFeeMicro, quote }),
      nonce,
    });
    if (!requotedTx) throw new Error('Unable to rebuild the sponsored transaction');
    await navigate(location.pathname, {
      replace: true,
      state: {
        ...routeState,
        tx: requotedTx.serialize(),
        sponsorship: { ...sponsorship, quoteId: quote.quoteId, expiresAt: quote.expiresAt },
        showRequoteCallout: true,
      } satisfies StacksConfirmationRouteState,
    });
  }

  function navigateToError(error: unknown) {
    void navigate(RouteUrls.BroadcastError, {
      state: { message: getSbtcSponsorshipErrorMessage(error) },
    });
  }

  async function submit() {
    if (isSbtcQuoteExpired(sponsorship.expiresAt)) return requote();
    const signedTx = await signStacksTransaction(tx);
    if (!signedTx) return;
    try {
      const response = await submitSponsoredTransaction({
        quoteId: sponsorship.quoteId,
        transaction: signedTx.serialize(),
      });
      await navigate(
        RouteUrls.SentStxTxSummary.replace(':symbol', symbol.toLowerCase()).replace(
          ':txid',
          response.txid
        ),
        { state: { tx: response.transaction } }
      );
    } catch (error) {
      if (isSbtcRequoteError(error)) return requote();
      throw error;
    }
  }

  async function onConfirmTransaction() {
    setIsSubmitting(true);
    try {
      await submit();
    } catch (error) {
      logger.error('Failed to submit sponsored sBTC transaction', error);
      navigateToError(error);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <>
      <PageHeader title="Review" />
      <Content>
        <Page>
          <SendFormConfirmationLayout
            symbol={symbol}
            txValue={amount}
            recipient={details.recipient}
            totalSpend={formatCurrency(sumMoney([amount, fee]))}
            sendingValue={formatCurrency(amount)}
            fee={feeDisplay}
            memoDisplayText={details.memo || 'No memo'}
            isLoading={isSubmitting}
            onBroadcastTransaction={() => void onConfirmTransaction()}
            callout={
              routeState.showRequoteCallout ? (
                <Callout
                  data-testid={SendCryptoAssetSelectors.SbtcFeeRequoteCallout}
                  variant="info"
                  title="Fee quote updated"
                  px="space.03"
                  mb="space.05"
                >
                  The previous fee quote expired. Review the updated sBTC fee and confirm again.
                </Callout>
              ) : undefined
            }
          />
        </Page>
      </Content>
    </>
  );
}
