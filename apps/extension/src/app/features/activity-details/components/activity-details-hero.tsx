import { ActivitySelectors } from '@tests/selectors/activity.selectors';
import { Stack, styled } from 'leather-styles/jsx';

import {
  type BlockchainActivityView,
  buildBlockchainActivityHeroLines,
} from '@leather.io/features';
import { BlockchainActivityAvatarIcon, BlockchainActivityIndicatorIcon } from '@leather.io/ui';

import type { SbtcDepositOverlay } from '@app/features/activity-list/sbtc-deposit-overlay';

const heroAvatarSize = 48;
const heroIndicatorSize = 16;

interface ActivityDetailsHeroProps {
  view: BlockchainActivityView;
  sbtcOverlay?: SbtcDepositOverlay;
}

export function ActivityDetailsHero({ view, sbtcOverlay }: ActivityDetailsHeroProps) {
  const hero = buildBlockchainActivityHeroLines(view);

  function renderSubtitle() {
    if (sbtcOverlay) {
      return (
        <styled.span textStyle="label.02" color={sbtcOverlay.statusColor}>
          {sbtcOverlay.statusLabel}
        </styled.span>
      );
    }
    if (!hero.subtitle) return null;
    return (
      <styled.span textStyle="label.02" color="ink.text-subdued" textAlign="center">
        {hero.subtitle}
      </styled.span>
    );
  }

  return (
    <Stack
      alignItems="center"
      gap="space.02"
      px="space.05"
      pt="space.05"
      pb="space.04"
      data-testid={ActivitySelectors.ActivityDetailsHero}
    >
      <BlockchainActivityAvatarIcon
        avatar={view.avatar}
        size={heroAvatarSize}
        indicator={
          <BlockchainActivityIndicatorIcon indicator={view.indicator} size={heroIndicatorSize} />
        }
      />
      <styled.span textStyle="heading.04" textAlign="center" wordBreak="break-word">
        {sbtcOverlay?.title ?? hero.title}
      </styled.span>
      {renderSubtitle()}
    </Stack>
  );
}
