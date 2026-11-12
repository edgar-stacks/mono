import type { ReactNode } from 'react';

import { HomePageSelectors } from '@tests/selectors/home.selectors';
import { Box } from 'leather-styles/jsx';

import { ChainId } from '@leather.io/models';
import { Badge, SheetHeader } from '@leather.io/ui';

import { useCurrentNetworkState } from '@app/store/networks/networks.hooks';

const mainnetChainId: number = ChainId.Mainnet;

interface ReceiveSheetHeaderProps {
  title: ReactNode;
  onClose?(): void;
}

export function ReceiveSheetHeader({ title, onClose }: ReceiveSheetHeaderProps) {
  const { chain, name } = useCurrentNetworkState();
  const isMainnet = chain.stacks.chainId === mainnetChainId;

  return (
    <Box>
      <SheetHeader variant="large" title={title} onClose={onClose} />
      {!isMainnet && (
        <Box px="space.05" pb="space.03">
          <Badge
            data-testid={HomePageSelectors.ReceiveNetworkBadge}
            label={name}
            variant="warning"
          />
        </Box>
      )}
    </Box>
  );
}
