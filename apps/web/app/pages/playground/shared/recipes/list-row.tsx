import { type ReactNode } from 'react';

import { styled } from 'leather-styles/jsx';

import { ListItemBox } from '@leather.io/ui';

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
  return (
    <ListItemBox
      leading={leading}
      title={<styled.span textStyle="label.02">{title}</styled.span>}
      caption={caption}
      trailing={trailing}
      trailingCaption={trailingCaption}
      onClick={onClick}
    />
  );
}
