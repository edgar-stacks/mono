import { type ReactNode } from 'react';

import { Flex, styled } from 'leather-styles/jsx';

import { Sheet, SheetHeader } from '@leather.io/ui';

interface ReviewSheetRow {
  label: string;
  value: ReactNode;
}

interface ReviewSheetProps {
  isShowing: boolean;
  title: string;
  rows: ReviewSheetRow[];
  summary?: ReactNode;
  actions: ReactNode;
  onClose(): void;
}

export function ReviewSheet({
  isShowing,
  title,
  rows,
  summary,
  actions,
  onClose,
}: ReviewSheetProps) {
  return (
    <Sheet
      isShowing={isShowing}
      onClose={onClose}
      title={title}
      header={<SheetHeader title={title} />}
      footer={actions}
    >
      <Flex
        direction="column"
        gap="space.05"
        px="space.05"
        pb="space.05"
        data-recipe="review-sheet"
      >
        {summary}
        <styled.dl display="flex" flexDirection="column" gap="space.03">
          {rows.map(row => (
            <Flex key={row.label} justifyContent="space-between" gap="space.04">
              <styled.dt textStyle="label.02" color="ink.text-subdued">
                {row.label}
              </styled.dt>
              <styled.dd textStyle="label.02" color="ink.text-primary" textAlign="right">
                {row.value}
              </styled.dd>
            </Flex>
          ))}
        </styled.dl>
      </Flex>
    </Sheet>
  );
}
