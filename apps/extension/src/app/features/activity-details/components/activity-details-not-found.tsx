import { ActivitySelectors } from '@tests/selectors/activity.selectors';
import { Stack, styled } from 'leather-styles/jsx';

import type { CryptoAssetChain } from '@leather.io/models';

import { ActivityDetailsExplorerButton } from './activity-details-explorer-button';

interface ActivityDetailsNotFoundProps {
  chain?: CryptoAssetChain;
  txid?: string;
}

export function ActivityDetailsNotFound({ chain, txid }: ActivityDetailsNotFoundProps) {
  return (
    <Stack gap="space.00" data-testid={ActivitySelectors.ActivityDetailsNotFound}>
      <Stack alignItems="center" gap="space.02" px="space.05" pt="space.07" pb="space.04">
        <styled.h2 textStyle="heading.05">Transaction not found</styled.h2>
        <styled.p textStyle="body.02" color="ink.text-subdued" textAlign="center">
          We could not find this transaction in your account's activity.
        </styled.p>
      </Stack>
      {chain && txid ? <ActivityDetailsExplorerButton chain={chain} txid={txid} /> : null}
    </Stack>
  );
}
