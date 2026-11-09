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

const stacksChainTxSummaryRouteStateSchema = z
  .object({ tx: z.string().optional() })
  .nullish()
  .catch(null);

function getSummaryComponent(symbol: string, tx: StacksTransactionWire) {
  if (symbol.toUpperCase() === 'STX') return StxSentSummary;
  if (getSbtcSponsoredTransferDetails(tx)) return SbtcSponsoredSentSummary;
  return Sip10SentSummary;
}

export function StacksChainTxSummaryRoute() {
  const { data: params } = routeParamsSchema.safeParse(useParams());
  const tx = useRouteState(stacksChainTxSummaryRouteStateSchema)?.tx;

  if (!params) return <Navigate to="/" replace />;

  if (!tx) {
    return (
      <StacksChainTxSummaryLoader
        txid={params.txid}
        fallback={<StacksChainTxSummaryLoading txid={params.txid} />}
      >
        {({ rawTx }) => {
          const loadedTx = deserializeTransaction(rawTx);
          const LoadedSummaryComponent = getSummaryComponent(params.symbol, loadedTx);
          return <LoadedSummaryComponent {...params} tx={loadedTx} />;
        }}
      </StacksChainTxSummaryLoader>
    );
  }

  const deserializedTx = deserializeTransaction(tx);
  const SummaryComponent = getSummaryComponent(params.symbol, deserializedTx);
  return <SummaryComponent {...params} tx={deserializedTx} />;
}
