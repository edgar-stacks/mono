import { Navigate, useParams } from 'react-router';

import { type StacksTransactionWire, deserializeTransaction } from '@stacks/transactions';
import z from 'zod';

import { getSbtcSponsoredTransferDetails } from '@leather.io/stacks';

import { useRouteState } from '@app/common/hooks/use-route-state';
import { StacksChainTxSummaryLoader } from '@app/pages/send/sent-summary/stacks/stacks-chain-tx-summary.loader';

import {
  SbtcSponsoredSentSummary,
  Sip10SentSummary,
  StxSentSummary,
} from './stacks-chain-tx-summary';
import { StacksChainTxSummaryLoading } from './stacks-chain-tx-summary.layout';

const routeParamsSchema = z.object({
  symbol: z.string(),
  txid: z.string(),
});

type SummaryRouteParams = z.infer<typeof routeParamsSchema>;

const stacksChainTxSummaryRouteStateSchema = z
  .object({ tx: z.string().optional() })
  .nullish()
  .catch(null);

export function StacksChainTxSummaryRoute() {
  const { data: params } = routeParamsSchema.safeParse(useParams());
  const tx = useRouteState(stacksChainTxSummaryRouteStateSchema)?.tx;

  if (!params) return <Navigate to="/" replace />;

  const SummaryComponent =
    params.symbol.toUpperCase() === 'STX' ? StxSentSummary : Sip10SentSummary;

  function renderSummary(summaryParams: SummaryRouteParams, transaction: StacksTransactionWire) {
    const sponsoredTransfer = getSbtcSponsoredTransferDetails(transaction);
    if (sponsoredTransfer)
      return (
        <SbtcSponsoredSentSummary {...summaryParams} tx={transaction} details={sponsoredTransfer} />
      );
    return <SummaryComponent {...summaryParams} tx={transaction} />;
  }

  if (!tx) {
    return (
      <StacksChainTxSummaryLoader
        txid={params.txid}
        fallback={<StacksChainTxSummaryLoading txid={params.txid} />}
      >
        {({ rawTx }) => renderSummary(params, deserializeTransaction(rawTx))}
      </StacksChainTxSummaryLoader>
    );
  }

  return renderSummary(params, deserializeTransaction(tx));
}
