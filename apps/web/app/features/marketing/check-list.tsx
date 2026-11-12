import { type HTMLStyledProps, styled } from 'leather-styles/jsx';

import { CheckmarkCircleIcon } from '@leather.io/ui';

interface CheckListProps extends HTMLStyledProps<'ul'> {
  items: string[];
}

export function CheckList({ items, ...props }: CheckListProps) {
  return (
    <styled.ul display="flex" gap="space.03" {...props}>
      {items.map(item => (
        <styled.li
          key={item}
          display="flex"
          alignItems="center"
          gap="space.02"
          textStyle="label.01"
        >
          <CheckmarkCircleIcon variant="small" color="green.action-primary-default" />
          {item}
        </styled.li>
      ))}
    </styled.ul>
  );
}
