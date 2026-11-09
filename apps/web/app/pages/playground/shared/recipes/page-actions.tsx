import { Flex } from 'leather-styles/jsx';

import { Button } from '@leather.io/ui';

interface PageActionsProps {
  primaryLabel: string;
  onPrimary?(): void;
  isPrimarySubmit?: boolean;
  isPrimaryDisabled?: boolean;
  isPrimaryLoading?: boolean;
  secondaryLabel?: string;
  onSecondary?(): void;
}

export function PageActions({
  primaryLabel,
  onPrimary,
  isPrimarySubmit = false,
  isPrimaryDisabled = false,
  isPrimaryLoading = false,
  secondaryLabel,
  onSecondary,
}: PageActionsProps) {
  return (
    <Flex gap="space.02" width="100%">
      {secondaryLabel && (
        <Button variant="outline" flex="1" onClick={onSecondary}>
          {secondaryLabel}
        </Button>
      )}
      <Button
        flex="1"
        type={isPrimarySubmit ? 'submit' : 'button'}
        disabled={isPrimaryDisabled}
        aria-busy={isPrimaryLoading}
        onClick={onPrimary}
      >
        {primaryLabel}
      </Button>
    </Flex>
  );
}
