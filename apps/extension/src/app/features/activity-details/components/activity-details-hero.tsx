import { Stack, styled } from 'leather-styles/jsx';

import {
  type BlockchainActivityView,
  buildBlockchainActivityHeroLines,
} from '@leather.io/features';
import { BlockchainActivityAvatarIcon, BlockchainActivityIndicatorIcon } from '@leather.io/ui';

import type { SbtcDepositOverlay } from '@app/features/activity-list/sbtc-deposit-overlay';

const heroAvatarSize = 56;
const heroIndicatorSize = 16;

interface ActivityDetailsHeroProps {
  view: BlockchainActivityView;
  sbtcOverlay?: SbtcDepositOverlay;
}

export function ActivityDetailsHero({ view, sbtcOverlay }: ActivityDetailsHeroProps) {
  const hero = buildBlockchainActivityHeroLines(view);
  const subtitle = sbtcOverlay?.statusLabel ?? hero.subtitle;
  const subtitleColor = sbtcOverlay?.statusColor ?? 'ink.text-subdued';

  return (
    <Stack alignItems="center" gap="space.02" px="space.05" pt="space.05" pb="space.04">
      <BlockchainActivityAvatarIcon
        avatar={view.avatar}
        size={heroAvatarSize}
        indicator={
          <BlockchainActivityIndicatorIcon indicator={view.indicator} size={heroIndicatorSize} />
        }
      />
      <styled.span textStyle="heading.04" textAlign="center">
        {sbtcOverlay?.title ?? hero.title}
      </styled.span>
      {subtitle ? (
        <styled.span textStyle="label.02" color={subtitleColor} textAlign="center">
          {subtitle}
        </styled.span>
      ) : null}
    </Stack>
  );
}
