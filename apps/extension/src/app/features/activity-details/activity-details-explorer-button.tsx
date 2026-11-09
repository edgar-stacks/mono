import { ActivitySelectors } from '@tests/selectors/activity.selectors';

import type { CryptoAssetChain } from '@leather.io/models';
import { Button } from '@leather.io/ui';

import { useOpenActivityInExplorer } from './use-open-activity-in-explorer';

interface ActivityDetailsExplorerButtonProps {
  chain: CryptoAssetChain;
  txid: string;
}

export function ActivityDetailsExplorerButton({ chain, txid }: ActivityDetailsExplorerButtonProps) {
  const openInExplorer = useOpenActivityInExplorer();
  return (
    <Button
      variant="outline"
      fullWidth
      onClick={() => openInExplorer(chain, txid)}
      data-testid={ActivitySelectors.ActivityDetailsExplorerButton}
    >
      View in explorer
    </Button>
  );
}
