import { type ReactNode } from 'react';

import { styled } from 'leather-styles/jsx';

import { InfoCircleIcon, InlineIcon } from '@leather.io/ui';

interface InlineInfoProps {
  children: ReactNode;
}

export function InlineInfo({ children }: InlineInfoProps) {
  return (
    <styled.p
      display="flex"
      alignItems="flex-start"
      textStyle="caption.01"
      color="ink.text-subdued"
      data-recipe="inline-info"
    >
      <InlineIcon icon={InfoCircleIcon} tone="subdued" placement="start" />
      <styled.span>{children}</styled.span>
    </styled.p>
  );
}
