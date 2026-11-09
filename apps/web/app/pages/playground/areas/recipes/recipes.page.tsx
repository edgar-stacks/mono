import { type ReactNode, useState } from 'react';

import { Box, Stack, styled } from 'leather-styles/jsx';

import { BtcAvatarIcon, Button, StxAvatarIcon } from '@leather.io/ui';
import { noop } from '@leather.io/utils';

import { ExplorationCanvas } from '../../shared/exploration/exploration-canvas';
import { ExplorationFrame } from '../../shared/exploration/exploration-frame';
import {
  explorationThemes,
  useExplorationParams,
} from '../../shared/exploration/exploration-params';
import { ExplorationRail } from '../../shared/exploration/exploration-rail';
import { AddressQr } from '../../shared/recipes/address-qr';
import { AmountDisplay } from '../../shared/recipes/amount-display';
import { InlineInfo } from '../../shared/recipes/inline-info';
import { ListRow } from '../../shared/recipes/list-row';
import { PageActions } from '../../shared/recipes/page-actions';
import { PageHeader } from '../../shared/recipes/page-header';
import { PageNotice } from '../../shared/recipes/page-notice';
import { PopupPage } from '../../shared/recipes/popup-page';
import { ReceiveAssetIdentity } from '../../shared/recipes/receive-asset-identity';
import { ReviewSheet } from '../../shared/recipes/review-sheet';
import { SectionHeader } from '../../shared/recipes/section-header';
import { TabPage } from '../../shared/recipes/tab-page';

const fixtureAddress = 'bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh';

function ReviewSheetDemo() {
  const [isShowing, setIsShowing] = useState(false);
  return (
    <Box p="space.05">
      <Button onClick={() => setIsShowing(true)}>Open review sheet</Button>
      <ReviewSheet
        title="Review"
        isShowing={isShowing}
        onClose={() => setIsShowing(false)}
        onConfirm={() => setIsShowing(false)}
        confirmLabel="Confirm and send"
      >
        <AmountDisplay amount="0.0125" symbol="BTC" fiat="$1,204.18" />
        <ListRow title="To" caption={fixtureAddress} />
        <ListRow
          title="Fee"
          trailing={<AmountDisplay amount="0.00001" symbol="BTC" size="small" />}
        />
      </ReviewSheet>
    </Box>
  );
}

interface RecipeExample {
  id: string;
  title: string;
  render(): ReactNode;
}

const recipeExamples: RecipeExample[] = [
  {
    id: 'popup-page',
    title: 'Popup page with header, notice and actions',
    render: () => (
      <PopupPage
        header={<PageHeader title="Send" onBack={noop} />}
        footer={<PageActions primaryLabel="Continue" secondaryLabel="Cancel" />}
      >
        <PageNotice tone="info" title="Fees are higher than usual" />
        <AmountDisplay amount="0.0125" symbol="BTC" fiat="$1,204.18" />
      </PopupPage>
    ),
  },
  {
    id: 'address-qr',
    title: 'Address QR with identity',
    render: () => (
      <Stack gap="space.05" p="space.05">
        <ReceiveAssetIdentity
          avatar={<BtcAvatarIcon size="lg" />}
          name="Bitcoin"
          network="Native SegWit"
        />
        <AddressQr address={fixtureAddress} />
      </Stack>
    ),
  },
  {
    id: 'list-rows',
    title: 'Section header and list rows',
    render: () => (
      <Stack gap="space.02" p="space.05">
        <SectionHeader title="Assets" />
        <ListRow
          leading={<BtcAvatarIcon size="lg" />}
          title="Bitcoin"
          caption="BTC"
          trailing={<AmountDisplay amount="0.0125" symbol="BTC" fiat="$1,204.18" size="small" />}
        />
        <ListRow
          leading={<StxAvatarIcon size="lg" />}
          title="Stacks"
          caption="STX"
          trailing={<AmountDisplay amount="1,240" symbol="STX" fiat="$2,108.00" size="small" />}
        />
        <InlineInfo info="Balances refresh every block">Updated just now</InlineInfo>
      </Stack>
    ),
  },
  {
    id: 'tab-page',
    title: 'Tab page',
    render: () => (
      <TabPage
        tabs={[
          { id: 'tokens', label: 'Tokens', content: <ListRow title="Bitcoin" caption="BTC" /> },
          {
            id: 'collectibles',
            label: 'Collectibles',
            content: <PageNotice title="No collectibles yet" />,
          },
        ]}
      />
    ),
  },
  {
    id: 'review-sheet',
    title: 'Review sheet',
    render: () => <ReviewSheetDemo />,
  },
];

export function RecipesPage() {
  const { params } = useExplorationParams();
  const themes = params.theme ? [params.theme] : explorationThemes;

  return (
    <ExplorationCanvas
      title="Recipes"
      description="Reviewed compositions of @leather.io/ui components. Copy a recipe before composing a new screen."
    >
      {recipeExamples.map(example => (
        <ExplorationRail key={example.id} title={example.title}>
          {themes.map(theme => (
            <ExplorationFrame
              key={theme}
              id={`${example.id}-${theme}`}
              label={theme}
              theme={theme}
              width={params.width}
            >
              {example.render()}
            </ExplorationFrame>
          ))}
        </ExplorationRail>
      ))}
      <styled.p textStyle="caption.01" color="ink.text-subdued">
        Add ?theme=dark or ?width=narrow to the URL to focus one state.
      </styled.p>
    </ExplorationCanvas>
  );
}
