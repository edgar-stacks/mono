import { type ReactElement, cloneElement } from 'react';

import { styled } from 'leather-styles/jsx';
import { type ColorToken } from 'leather-styles/tokens';

import { type IconProps } from '../../icons/icon/create-icon.web';

type InlineIconTone = 'inherit' | 'secondary' | 'subdued';
type InlineIconSize = 'small' | 'medium';
type InlineIconPlacement = 'start' | 'end' | 'inline';

const toneColorMap: Record<InlineIconTone, ColorToken> = {
  inherit: 'current',
  secondary: 'ink.text-secondary',
  subdued: 'ink.text-subdued',
};

export interface InlineIconProps {
  icon: ReactElement<IconProps>;
  tone?: InlineIconTone;
  size?: InlineIconSize;
  placement?: InlineIconPlacement;
}

export function InlineIcon({
  icon,
  tone = 'inherit',
  size = 'small',
  placement = 'inline',
}: InlineIconProps) {
  return (
    <styled.span
      aria-hidden="true"
      data-placement={placement}
      display="inline-flex"
      alignItems="center"
      flexShrink={0}
      verticalAlign="middle"
      mr={placement === 'start' ? 'space.01' : undefined}
      ml={placement === 'end' ? 'space.01' : undefined}
    >
      {cloneElement(icon, { variant: size, color: toneColorMap[tone] })}
    </styled.span>
  );
}
