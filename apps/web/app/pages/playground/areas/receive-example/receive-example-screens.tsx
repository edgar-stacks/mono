import { Flex } from 'leather-styles/jsx';

import { BtcAvatarIcon, StxAvatarIcon } from '@leather.io/ui';

import { AddressQr } from '../../shared/recipes/address-qr';
import { AmountDisplay } from '../../shared/recipes/amount-display';
import { InlineInfo } from '../../shared/recipes/inline-info';
import { ListRow } from '../../shared/recipes/list-row';
import { PageActions } from '../../shared/recipes/page-actions';
import { PageHeader } from '../../shared/recipes/page-header';
import { PopupPage } from '../../shared/recipes/popup-page';
import { ReceiveAssetIdentity } from '../../shared/recipes/receive-asset-identity';
import { SectionHeader } from '../../shared/recipes/section-header';
import { type ReceiveExampleAsset, receiveExampleAssets } from './receive-example-fixtures';

function AssetAvatar({ asset, size }: { asset: ReceiveExampleAsset; size: 'md' | 'xl' }) {
  return asset.id === 'btc' ? <BtcAvatarIcon size={size} /> : <StxAvatarIcon size={size} />;
}

interface ChooseAssetScreenProps {
  assets?: ReceiveExampleAsset[];
  onSelect(asset: ReceiveExampleAsset): void;
  onClose?(): void;
}

export function ChooseAssetScreen({
  assets = receiveExampleAssets,
  onSelect,
  onClose,
}: ChooseAssetScreenProps) {
  return (
    <PopupPage header={<PageHeader title="Receive" onClose={onClose} />}>
      <Flex direction="column" gap="space.03">
        <SectionHeader title="Choose an asset" />
        {assets.map(asset => (
          <ListRow
            key={asset.id}
            leading={<AssetAvatar asset={asset} size="md" />}
            title={asset.name}
            caption={asset.symbol}
            trailing={<AmountDisplay amount={asset.balance} symbol={asset.symbol} size="small" />}
            onClick={() => onSelect(asset)}
          />
        ))}
      </Flex>
    </PopupPage>
  );
}

interface ReceiveAddressScreenProps {
  asset: ReceiveExampleAsset;
  onBack?(): void;
  onDone?(): void;
}

export function ReceiveAddressScreen({ asset, onBack, onDone }: ReceiveAddressScreenProps) {
  return (
    <PopupPage
      header={<PageHeader title={`Receive ${asset.symbol}`} onBack={onBack} />}
      actions={<PageActions primary={{ label: 'Done', onClick: onDone }} />}
    >
      <Flex direction="column" alignItems="center" gap="space.05">
        <ReceiveAssetIdentity
          avatar={<AssetAvatar asset={asset} size="xl" />}
          name={asset.name}
          network={asset.network}
        />
        <AddressQr address={asset.address} />
        <InlineInfo>Fixture data. Nothing on this screen reads a real wallet.</InlineInfo>
      </Flex>
    </PopupPage>
  );
}
