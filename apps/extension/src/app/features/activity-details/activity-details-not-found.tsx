import { Stack, styled } from 'leather-styles/jsx';

import type { CryptoAssetChain } from '@leather.io/models';

import { ActivityDetailsExplorerButton } from './activity-details-explorer-button';

interface ActivityDetailsNotFoundProps {
  chain?: CryptoAssetChain;
  txid?: string;
}

export function ActivityDetailsNotFound({ chain, txid }: ActivityDetailsNotFoundProps) {
  return (
    <Stack alignItems="center" gap="space.05" px="space.05" py="space.09">
      <Stack gap="space.02" alignItems="center" maxWidth="340px">
        <styled.h2 textStyle="heading.04">Transaction not found</styled.h2>
        <styled.p textStyle="body.02" color="ink.text-subdued" textAlign="center">
          We could not load this transaction. It may not have reached the network yet.
        </styled.p>
      </Stack>
      {chain && txid ? <ActivityDetailsExplorerButton chain={chain} txid={txid} /> : null}
    </Stack>
  );
}
