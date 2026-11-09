import { Flex, styled } from 'leather-styles/jsx';

import { CheckmarkCircleIcon } from '@leather.io/ui';

interface CheckListProps {
  items: string[];
  direction?: 'row' | 'column';
}

export function CheckList({ items, direction = 'column' }: CheckListProps) {
  return (
    <Flex
      as="ul"
      flexDirection={direction}
      flexWrap="wrap"
      gap={direction === 'row' ? 'space.05' : 'space.03'}
    >
      {items.map(item => (
        <Flex as="li" key={item} alignItems="center" gap="space.02" textStyle="body.01">
          <CheckmarkCircleIcon variant="small" color="green.action-primary-default" />
          <styled.span color="ink.text-subdued">{item}</styled.span>
        </Flex>
      ))}
    </Flex>
  );
}
