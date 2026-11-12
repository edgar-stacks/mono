import { Stack, styled } from 'leather-styles/jsx';

import type { CryptoAssetChain } from '@leather.io/models';

import { ActivityDetailsExplorerButton } from './activity-details-explorer-button';

interface ActivityDetailsNotFoundProps {
  chain?: CryptoAssetChain;
  txid?: string;
}

export function ActivityDetailsNotFound({ chain, txid }: ActivityDetailsNotFoundProps) {
  return (
    <Stack gap="space.00">
      <Stack alignItems="center" gap="space.02" px="space.05" py="space.07">
        <styled.span textStyle="heading.05">Transaction not found</styled.span>
        <styled.p textStyle="body.02" color="ink.text-subdued" textAlign="center">
          We could not find this transaction in your account.
        </styled.p>
      </Stack>
      {chain && txid ? <ActivityDetailsExplorerButton chain={chain} txid={txid} /> : null}
    </Stack>
  );
}
