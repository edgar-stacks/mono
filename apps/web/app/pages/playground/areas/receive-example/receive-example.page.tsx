import { useState } from 'react';

import { Flex } from 'leather-styles/jsx';

import { Button } from '@leather.io/ui';

import { ClickThrough } from '../../shared/exploration/click-through';
import { ExplorationCanvas } from '../../shared/exploration/exploration-canvas';
import { ExplorationFrame } from '../../shared/exploration/exploration-frame';
import { ExplorationLightbox } from '../../shared/exploration/exploration-lightbox';
import {
  type ExplorationSize,
  explorationThemes,
  useExplorationParams,
} from '../../shared/exploration/exploration-params';
import { ExplorationRail } from '../../shared/exploration/exploration-rail';
import { type ReceiveExampleAsset, receiveExampleAssets } from './receive-example-fixtures';
import { ChooseAssetScreen, ReceiveAddressScreen } from './receive-example-screens';

const sizeOptions: { size: ExplorationSize; label: string }[] = [
  { size: 'popup', label: 'Popup' },
  { size: 'narrow', label: 'Narrow' },
  { size: 'long', label: 'Long' },
];

const defaultAsset = receiveExampleAssets[0];

export function ReceiveExamplePage() {
  const params = useExplorationParams();
  const [selectedAsset, setSelectedAsset] = useState<ReceiveExampleAsset | undefined>(defaultAsset);
  const asset = selectedAsset ?? defaultAsset;

  if (!asset) return null;

  const states = [
    {
      id: 'choose-asset',
      label: 'Choose asset',
      render: () => <ChooseAssetScreen onSelect={setSelectedAsset} />,
    },
    {
      id: 'receive-address',
      label: `Receive ${asset.symbol}`,
      render: () => <ReceiveAddressScreen asset={asset} />,
    },
  ];
  const expanded = states.find(state => state.id === params.openFrame);

  const controls = (
    <Flex gap="space.02" flexWrap="wrap">
      {explorationThemes.map(theme => (
        <Button
          key={theme}
          size="sm"
          variant={params.themes.length === 1 && params.themes[0] === theme ? 'solid' : 'outline'}
          onClick={() => params.setTheme(theme)}
        >
          {theme === 'light' ? 'Light' : 'Dark'}
        </Button>
      ))}
      <Button
        size="sm"
        variant={params.themes.length > 1 ? 'solid' : 'outline'}
        onClick={() => params.setTheme(null)}
      >
        Both themes
      </Button>
      {sizeOptions.map(option => (
        <Button
          key={option.size}
          size="sm"
          variant={params.size === option.size ? 'solid' : 'outline'}
          onClick={() => params.setSize(option.size)}
        >
          {option.label}
        </Button>
      ))}
    </Flex>
  );

  return (
    <ExplorationCanvas
      title="Receive example"
      description="A fixture-only Receive flow composed from the Playground recipes. Compare each state in light and dark, at popup, narrow and long sizes, or click through it."
      controls={controls}
    >
      <ExplorationRail title="States" description="Every screen of the flow side by side.">
        {states.flatMap(state =>
          params.themes.map(theme => (
            <ExplorationFrame
              key={`${state.id}-${theme}`}
              id={state.id}
              label={state.label}
              theme={theme}
              size={params.size}
              onExpand={params.setOpenFrame}
            >
              {state.render()}
            </ExplorationFrame>
          ))
        )}
      </ExplorationRail>
      <ExplorationRail title="Click-through" description="Walk the flow the way a user would.">
        <ClickThrough
          step={params.step}
          onStepChange={params.setStep}
          steps={[
            {
              id: 'choose-asset',
              label: 'Choose asset',
              render: ({ next }) => (
                <Flex gap="space.06">
                  {params.themes.map(theme => (
                    <ExplorationFrame
                      key={theme}
                      id="click-through-choose-asset"
                      label="Choose asset"
                      theme={theme}
                      size={params.size}
                    >
                      <ChooseAssetScreen
                        onSelect={nextAsset => {
                          setSelectedAsset(nextAsset);
                          next();
                        }}
                      />
                    </ExplorationFrame>
                  ))}
                </Flex>
              ),
            },
            {
              id: 'receive-address',
              label: `Receive ${asset.symbol}`,
              render: ({ back, restart }) => (
                <Flex gap="space.06">
                  {params.themes.map(theme => (
                    <ExplorationFrame
                      key={theme}
                      id="click-through-receive-address"
                      label={`Receive ${asset.symbol}`}
                      theme={theme}
                      size={params.size}
                    >
                      <ReceiveAddressScreen asset={asset} onBack={back} onDone={restart} />
                    </ExplorationFrame>
                  ))}
                </Flex>
              ),
            },
          ]}
        />
      </ExplorationRail>
      <ExplorationLightbox
        title={expanded?.label ?? ''}
        isShowing={Boolean(expanded)}
        onClose={() => params.setOpenFrame(null)}
      >
        {expanded ? (
          <ExplorationFrame
            id={`${expanded.id}-expanded`}
            label={expanded.label}
            theme={params.themes[0] ?? 'light'}
            size={params.size}
          >
            {expanded.render()}
          </ExplorationFrame>
        ) : null}
      </ExplorationLightbox>
    </ExplorationCanvas>
  );
}
