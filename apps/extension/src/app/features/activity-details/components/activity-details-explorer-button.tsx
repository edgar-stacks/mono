import { ActivitySelectors } from '@tests/selectors/activity.selectors';
import { Box } from 'leather-styles/jsx';

import type { CryptoAssetChain } from '@leather.io/models';
import { Button } from '@leather.io/ui';

import { analytics } from '@shared/utils/analytics';

import { useBitcoinExplorerLink } from '@app/common/hooks/use-bitcoin-explorer-link';
import { useStacksExplorerLink } from '@app/common/hooks/use-stacks-explorer-link';

interface ActivityDetailsExplorerButtonProps {
  chain: CryptoAssetChain;
  txid: string;
}

export function ActivityDetailsExplorerButton({ chain, txid }: ActivityDetailsExplorerButtonProps) {
  const { handleOpenBitcoinTxLink } = useBitcoinExplorerLink();
  const { handleOpenStacksTxLink } = useStacksExplorerLink();

  function openInExplorer() {
    if (chain === 'bitcoin') {
      analytics.track('view_bitcoin_transaction');
      handleOpenBitcoinTxLink({ txid });
      return;
    }
    analytics.track('view_transaction');
    handleOpenStacksTxLink({ txid });
  }

  return (
    <Box px="space.05" py="space.04">
      <Button
        variant="outline"
        fullWidth
        onClick={openInExplorer}
        data-testid={ActivitySelectors.ActivityDetailsExplorerBtn}
      >
        View in explorer
      </Button>
    </Box>
  );
}
