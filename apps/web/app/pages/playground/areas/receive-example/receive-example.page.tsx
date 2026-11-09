import { type ReactNode, useState } from 'react';

import { Flex, Stack } from 'leather-styles/jsx';

import { BtcAvatarIcon, ChevronRightIcon, StxAvatarIcon } from '@leather.io/ui';
import { noop } from '@leather.io/utils';

import { ClickThrough } from '../../shared/exploration/click-through';
import { ExplorationCanvas } from '../../shared/exploration/exploration-canvas';
import { ExplorationFrame } from '../../shared/exploration/exploration-frame';
import { ExplorationLightbox } from '../../shared/exploration/exploration-lightbox';
import {
  type ExplorationTheme,
  explorationThemes,
  useExplorationParams,
} from '../../shared/exploration/exploration-params';
import { ExplorationRail } from '../../shared/exploration/exploration-rail';
import { AddressQr } from '../../shared/recipes/address-qr';
import { ListRow } from '../../shared/recipes/list-row';
import { PageActions } from '../../shared/recipes/page-actions';
import { PageHeader } from '../../shared/recipes/page-header';
import { PageNotice } from '../../shared/recipes/page-notice';
import { PopupPage } from '../../shared/recipes/popup-page';
import { ReceiveAssetIdentity } from '../../shared/recipes/receive-asset-identity';
import { SectionHeader } from '../../shared/recipes/section-header';
import { type ReceiveFixtureAsset, receiveFixtureAssets } from './receive-example.fixtures';

function AssetAvatar({ asset }: { asset: ReceiveFixtureAsset }) {
  return asset.id === 'btc' ? <BtcAvatarIcon size="lg" /> : <StxAvatarIcon size="lg" />;
}

interface ChooseAssetProps {
  onChoose(asset: ReceiveFixtureAsset): void;
}

function ChooseAsset({ onChoose }: ChooseAssetProps) {
  return (
    <PopupPage header={<PageHeader title="Receive" />}>
      <Stack gap="space.02">
        <SectionHeader title="Choose an asset" />
        {receiveFixtureAssets.map(asset => (
          <ListRow
            key={asset.id}
            leading={<AssetAvatar asset={asset} />}
            title={asset.name}
            caption={asset.network}
            trailing={<ChevronRightIcon variant="small" color="ink.text-subdued" />}
            onClick={() => onChoose(asset)}
          />
        ))}
      </Stack>
    </PopupPage>
  );
}

interface ShowAddressProps {
  asset: ReceiveFixtureAsset;
  onBack(): void;
  onDone(): void;
}

function ShowAddress({ asset, onBack, onDone }: ShowAddressProps) {
  return (
    <PopupPage
      header={<PageHeader title={`Receive ${asset.name}`} onBack={onBack} />}
      footer={<PageActions primaryLabel="Done" onPrimary={onDone} />}
    >
      <ReceiveAssetIdentity
        avatar={<AssetAvatar asset={asset} />}
        name={asset.name}
        network={asset.network}
      />
      <AddressQr address={asset.address} />
      <PageNotice tone="warning" title={`Only send ${asset.name} to this address`}>
        Assets from other networks sent here may be lost.
      </PageNotice>
    </PopupPage>
  );
}

function ReceiveFlow() {
  const [asset, setAsset] = useState<ReceiveFixtureAsset>(receiveFixtureAssets[0]);

  return (
    <ClickThrough
      steps={[
        {
          id: 'choose-asset',
          label: 'Choose an asset',
          render: ({ next }) => (
            <ChooseAsset
              onChoose={chosen => {
                setAsset(chosen);
                next();
              }}
            />
          ),
        },
        {
          id: 'show-address',
          label: 'Show the address',
          render: ({ back, restart }) => (
            <ShowAddress asset={asset} onBack={back} onDone={restart} />
          ),
        },
      ]}
    />
  );
}

interface ReceiveStateFrame {
  id: string;
  label: string;
  render(): ReactNode;
}

const stateFrames: ReceiveStateFrame[] = [
  {
    id: 'choose-asset',
    label: 'Choose an asset',
    render: () => <ChooseAsset onChoose={noop} />,
  },
  ...receiveFixtureAssets.map(asset => ({
    id: `show-address-${asset.id}`,
    label: `${asset.name} address`,
    render: () => <ShowAddress asset={asset} onBack={noop} onDone={noop} />,
  })),
];

function frameId(stateId: string, theme: ExplorationTheme) {
  return `${stateId}-${theme}`;
}

export function ReceiveExamplePage() {
  const { params, update } = useExplorationParams();
  const themes = params.theme ? [params.theme] : explorationThemes;
  const openFrame = stateFrames
    .flatMap(state => explorationThemes.map(theme => ({ state, theme })))
    .find(({ state, theme }) => frameId(state.id, theme) === params.frame);

  return (
    <ExplorationCanvas
      title="Receive example"
      description="A fixture-only Receive flow composed from the Playground recipes. Click through it, or compare every state in light and dark."
    >
      <ExplorationRail title="Click-through" description="Choose an asset, then copy its address.">
        <ExplorationFrame
          id="click-through"
          label="Receive flow"
          theme={params.theme ?? 'light'}
          width={params.width}
        >
          <ReceiveFlow />
        </ExplorationFrame>
      </ExplorationRail>
      {themes.map(theme => (
        <ExplorationRail key={theme} title={`States, ${theme}`}>
          <Flex gap="space.05">
            {stateFrames.map(state => (
              <ExplorationFrame
                key={state.id}
                id={frameId(state.id, theme)}
                label={state.label}
                theme={theme}
                width={params.width}
                onOpen={id => update({ frame: id })}
              >
                {state.render()}
              </ExplorationFrame>
            ))}
          </Flex>
        </ExplorationRail>
      ))}
      {openFrame && (
        <ExplorationLightbox label={openFrame.state.label} onClose={() => update({ frame: null })}>
          <ExplorationFrame
            id={frameId(openFrame.state.id, openFrame.theme)}
            label={`${openFrame.state.label}, ${openFrame.theme}`}
            theme={openFrame.theme}
            width={params.width}
          >
            {openFrame.state.render()}
          </ExplorationFrame>
        </ExplorationLightbox>
      )}
    </ExplorationCanvas>
  );
}
