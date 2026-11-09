import { type ReactNode } from 'react';

import { styled } from 'leather-styles/jsx';

import { BasicTooltip, InfoCircleIcon, InlineIcon } from '@leather.io/ui';

interface InlineInfoProps {
  children: ReactNode;
  info: string;
}

export function InlineInfo({ children, info }: InlineInfoProps) {
  return (
    <styled.span
      textStyle="caption.01"
      color="ink.text-subdued"
      display="inline-flex"
      alignItems="center"
    >
      {children}
      <BasicTooltip asChild label={info}>
        <styled.span display="inline-flex" aria-label={info} tabIndex={0}>
          <InlineIcon icon={<InfoCircleIcon />} tone="subdued" placement="end" />
        </styled.span>
      </BasicTooltip>
    </styled.span>
  );
}
