import { type ReactNode } from 'react';

import { styled } from 'leather-styles/jsx';

import { ChevronRightIcon, InlineIcon, ListItemBox } from '@leather.io/ui';

interface ListRowProps {
  title: string;
  caption?: ReactNode;
  leading?: ReactNode;
  trailing?: ReactNode;
  trailingCaption?: ReactNode;
  onClick?(): void;
}

export function ListRow({
  title,
  caption,
  leading,
  trailing,
  trailingCaption,
  onClick,
}: ListRowProps) {
  const navigationIndicator = onClick ? (
    <InlineIcon icon={ChevronRightIcon} tone="subdued" placement="end" />
  ) : null;

  return (
    <ListItemBox
      leading={leading}
      title={
        <styled.span textStyle="label.02" color="ink.text-primary">
          {title}
        </styled.span>
      }
      caption={
        caption ? (
          <styled.span textStyle="caption.01" color="ink.text-subdued">
            {caption}
          </styled.span>
        ) : undefined
      }
      trailing={trailing}
      trailingCaption={trailingCaption}
      action={navigationIndicator}
      onClick={onClick}
    />
  );
}
