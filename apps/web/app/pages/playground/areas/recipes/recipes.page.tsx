import { type ReactNode, useState } from 'react';

import { Box, Flex, styled } from 'leather-styles/jsx';

import { BtcAvatarIcon, Button } from '@leather.io/ui';
import { noop } from '@leather.io/utils';

import { ExplorationCanvas } from '../../shared/exploration/exploration-canvas';
import { ExplorationFrame } from '../../shared/exploration/exploration-frame';
import { useExplorationParams } from '../../shared/exploration/exploration-params';
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

const sampleAddress = 'bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh';

interface RecipeExample {
  id: string;
  title: string;
  job: string;
  render(): ReactNode;
}

const recipeExamples: RecipeExample[] = [
  {
    id: 'popup-page',
    title: 'Popup page',
    job: 'A full extension popup screen: header, scrolling body, pinned actions.',
    render: () => (
      <PopupPage
        header={<PageHeader title="Send" onBack={noop} />}
        actions={<PageActions primary={{ label: 'Continue' }} />}
      >
        <InlineInfo>Body content scrolls between the header and the actions.</InlineInfo>
      </PopupPage>
    ),
  },
  {
    id: 'page-header',
    title: 'Page header',
    job: 'A screen title with back and close actions.',
    render: () => <PageHeader title="Receive" onBack={noop} onClose={noop} />,
  },
  {
    id: 'section-header',
    title: 'Section header',
    job: 'A label above a group, with an optional action.',
    render: () => (
      <Box p="space.05">
        <SectionHeader
          title="Assets"
          action={
            <Button size="sm" variant="ghost">
              Manage
            </Button>
          }
        />
      </Box>
    ),
  },
  {
    id: 'list-row',
    title: 'List row',
    job: 'A tappable row with an avatar, a title, a caption and a value.',
    render: () => (
      <Box p="space.05">
        <ListRow
          leading={<BtcAvatarIcon size="md" />}
          title="Bitcoin"
          caption="BTC"
          trailing={<AmountDisplay amount="0.04821" symbol="BTC" size="small" />}
          onClick={noop}
        />
      </Box>
    ),
  },
  {
    id: 'amount-display',
    title: 'Amount display',
    job: 'An amount with its symbol and fiat value, in tabular numerals.',
    render: () => (
      <Box p="space.05">
        <AmountDisplay amount="0.04821" symbol="BTC" fiatAmount="$4,821.00" />
      </Box>
    ),
  },
  {
    id: 'address-qr',
    title: 'Address with QR',
    job: 'Show an address with a QR code and copy.',
    render: () => (
      <Box p="space.05">
        <AddressQr address={sampleAddress} />
      </Box>
    ),
  },
  {
    id: 'receive-asset-identity',
    title: 'Receive asset identity',
    job: 'Which asset and network a Receive screen is for.',
    render: () => (
      <Box p="space.05">
        <ReceiveAssetIdentity avatar={<BtcAvatarIcon />} name="Bitcoin" network="Bitcoin" />
      </Box>
    ),
  },
  {
    id: 'inline-info',
    title: 'Inline info',
    job: 'A short explanatory note next to the thing it explains.',
    render: () => (
      <Box p="space.05">
        <InlineInfo>Network fees go to miners, not to Leather.</InlineInfo>
      </Box>
    ),
  },
  {
    id: 'page-notice',
    title: 'Page notice',
    job: 'A page-level message that needs attention.',
    render: () => (
      <Box p="space.05">
        <PageNotice variant="warning" title="Only send Bitcoin">
          Assets from other networks sent to this address are lost.
        </PageNotice>
      </Box>
    ),
  },
  {
    id: 'page-actions',
    title: 'Page actions',
    job: 'The primary and secondary actions at the end of a screen.',
    render: () => (
      <Box p="space.05">
        <PageActions primary={{ label: 'Confirm' }} secondary={{ label: 'Cancel' }} />
      </Box>
    ),
  },
  {
    id: 'tab-page',
    title: 'Tab page',
    job: 'Switch between sibling views of one page.',
    render: () => (
      <TabPage
        tabs={[
          {
            value: 'assets',
            label: 'Assets',
            content: <InlineInfo>Assets tab content.</InlineInfo>,
          },
          {
            value: 'activity',
            label: 'Activity',
            content: <InlineInfo>Activity tab content.</InlineInfo>,
          },
        ]}
      />
    ),
  },
];

function ReviewSheetExample() {
  const [isShowing, setIsShowing] = useState(false);

  return (
    <Flex direction="column" gap="space.03" alignItems="flex-start">
      <styled.p textStyle="body.02" color="ink.text-subdued">
        Review a transaction before confirming it. Opens a Sheet with a pinned footer.
      </styled.p>
      <Button size="sm" variant="outline" onClick={() => setIsShowing(true)}>
        Open review sheet
      </Button>
      <ReviewSheet
        isShowing={isShowing}
        title="Review"
        onClose={() => setIsShowing(false)}
        summary={<AmountDisplay amount="0.01" symbol="BTC" fiatAmount="$1,000.00" />}
        rows={[
          { label: 'To', value: 'bc1qxy…0wlh' },
          { label: 'Fee', value: '0.00002 BTC' },
          { label: 'Arrives', value: '~30 minutes' },
        ]}
        actions={
          <PageActions
            primary={{ label: 'Confirm', onClick: () => setIsShowing(false) }}
            secondary={{ label: 'Cancel', onClick: () => setIsShowing(false) }}
          />
        }
      />
    </Flex>
  );
}

export function RecipesPage() {
  const params = useExplorationParams();

  return (
    <ExplorationCanvas
      title="Recipes"
      description="Reviewed compositions of @leather.io/ui components, one per job. Copy these instead of composing raw elements."
    >
      {recipeExamples.map(example => (
        <ExplorationRail key={example.id} title={example.title} description={example.job}>
          {params.themes.map(theme => (
            <ExplorationFrame
              key={theme}
              id={`${example.id}-${theme}`}
              label={example.title}
              theme={theme}
              size={params.size}
            >
              {example.render()}
            </ExplorationFrame>
          ))}
        </ExplorationRail>
      ))}
      <ExplorationRail title="Review sheet" description="Review a transaction before confirming.">
        <ReviewSheetExample />
      </ExplorationRail>
    </ExplorationCanvas>
  );
}
