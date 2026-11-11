import { Stack } from 'leather-styles/jsx';
import { z } from 'zod';

import { analytics } from '@shared/utils/analytics';

import { useBitcoinExplorerLink } from '@app/common/hooks/use-bitcoin-explorer-link';
import { useRouteState } from '@app/common/hooks/use-route-state';
import { FormAddressDisplayer } from '@app/components/address-displayer/form-address-displayer';
import {
  InfoCardAssetValue,
  InfoCardRow,
  InfoCardSeparator,
} from '@app/components/info-card/info-card';
import { Card, Content, Page, SummaryFooter } from '@app/components/layout';
import { PageHeader } from '@app/features/container/headers/page.header';
import { useCopyTransactionId } from '@app/features/token/hooks/use-copy-transaction-id';

import { TxDone } from '../send-crypto-asset-form/components/tx-done';

const btcSentSummaryStateSchema = z.object({
  txId: z.string(),
  txValue: z.string(),
  txFiatValue: z.string(),
  txFiatValueSymbol: z.string(),
  symbol: z.string(),
  arrivesIn: z.string(),
  sendingValue: z.string(),
  recipient: z.string(),
  totalSpend: z.string(),
  feeRowValue: z.string(),
});

export type BtcSentSummaryState = z.infer<typeof btcSentSummaryStateSchema>;

export function BtcSentSummary() {
  const {
    txId,
    txValue,
    txFiatValue,
    txFiatValueSymbol,
    symbol,
    arrivesIn,
    sendingValue,
    recipient,
    totalSpend,
    feeRowValue,
  } = useRouteState(btcSentSummaryStateSchema);

  const copyTransactionId = useCopyTransactionId();
  const { handleOpenBitcoinTxLink: handleOpenTxLink } = useBitcoinExplorerLink();

  function onClickLink() {
    analytics.track('view_transaction_confirmation', { symbol: 'BTC' });
    handleOpenTxLink({ txid: txId });
  }

  function onClickCopy() {
    copyTransactionId(txId);
  }

  return (
    <>
      <PageHeader title="Sent" isSummaryPage />
      <Content>
        <Page>
          <Card
            contentStyle={{
              p: 'space.00',
            }}
            footer={<SummaryFooter onClickCopy={onClickCopy} onClickLink={onClickLink} />}
          >
            <TxDone />
            <InfoCardAssetValue
              fiatSymbol={txFiatValueSymbol}
              fiatValue={txFiatValue}
              px="space.05"
              symbol={symbol}
              value={txValue}
            />

            <Stack pb="space.06" px="space.06" width="100%">
              <InfoCardRow title="To" value={<FormAddressDisplayer address={recipient} />} />
              <InfoCardSeparator />
              <InfoCardRow title="Total spend" value={totalSpend} />

              <InfoCardRow title="Sending" value={sendingValue} />
              <InfoCardRow title="Fee" value={feeRowValue} />
              {arrivesIn && <InfoCardRow title="Arrives in" value={arrivesIn} />}
            </Stack>
          </Card>
        </Page>
      </Content>
    </>
  );
}
