import { HomePageSelectors } from '@tests/selectors/home.selectors';
import { css } from 'leather-styles/css';
import { Stack } from 'leather-styles/jsx';

import { StxAvatarIcon } from '@leather.io/ui';

import { useCopyAddress } from '@app/features/token/hooks/use-copy-address';

import { receiveTabStyle } from '../receive-tab-style';
import { ReceiveItem } from './receive-item';

interface ReceiveCollectiblesProps {
  stxAddress: string;
  onClickQrStacksNft(): void;
}
export function ReceiveCollectibles({ stxAddress, onClickQrStacksNft }: ReceiveCollectiblesProps) {
  const copyAddress = useCopyAddress();
  return (
    <Stack className={css(receiveTabStyle)}>
      <ReceiveItem
        address={stxAddress}
        copyDataTestId={HomePageSelectors.ReceiveStacksNftCopyBtn}
        icon={<StxAvatarIcon />}
        onCopyAddress={() => {
          copyAddress(stxAddress);
        }}
        onClickQrCode={onClickQrStacksNft}
        title="Stacks NFT"
      />
    </Stack>
  );
}
