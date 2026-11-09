import { ActivitySelectors } from '@tests/selectors/activity.selectors';
import { Box } from 'leather-styles/jsx';

import type { CryptoAssetChain } from '@leather.io/models';
import { Button } from '@leather.io/ui';

import { useActivityExplorer } from '../use-activity-explorer';

interface ActivityDetailsExplorerButtonProps {
  chain: CryptoAssetChain;
  txid: string;
}

export function ActivityDetailsExplorerButton({ chain, txid }: ActivityDetailsExplorerButtonProps) {
  const openInExplorer = useActivityExplorer();
  return (
    <Box px="space.05" py="space.04">
      <Button
        fullWidth
        variant="outline"
        onClick={() => openInExplorer(chain, txid)}
        data-testid={ActivitySelectors.ActivityDetailsExplorerBtn}
      >
        View in explorer
      </Button>
    </Box>
  );
}
