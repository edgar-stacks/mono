import { type ComponentType } from 'react';

import { styled } from 'leather-styles/jsx';
import { type ColorToken } from 'leather-styles/tokens';

import { type IconProps } from '../../icons/icon/create-icon.web';

type InlineIconTone = 'inherit' | 'secondary' | 'subdued';
type InlineIconSize = 'small' | 'medium';
type InlineIconPlacement = 'start' | 'end' | 'standalone';

const toneColorMap: Record<InlineIconTone, ColorToken> = {
  inherit: 'current',
  secondary: 'ink.text-secondary',
  subdued: 'ink.text-subdued',
};

const InlineIconContainer = styled('span', {
  base: {
    display: 'inline-flex',
    alignItems: 'center',
    flexShrink: 0,
    verticalAlign: 'middle',
  },
  variants: {
    placement: {
      start: { mr: 'space.01' },
      end: { ml: 'space.01' },
      standalone: {},
    },
  },
  defaultVariants: { placement: 'standalone' },
});

export interface InlineIconProps {
  icon: ComponentType<IconProps>;
  tone?: InlineIconTone;
  size?: InlineIconSize;
  placement?: InlineIconPlacement;
  label?: string;
}

export function InlineIcon({
  icon: Icon,
  tone = 'inherit',
  size = 'small',
  placement = 'standalone',
  label,
}: InlineIconProps) {
  return (
    <InlineIconContainer
      placement={placement}
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    >
      <Icon variant={size} color={toneColorMap[tone]} aria-hidden />
    </InlineIconContainer>
  );
}
