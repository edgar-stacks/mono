import { Flex } from 'leather-styles/jsx';

import { Button } from '@leather.io/ui';

interface PageAction {
  label: string;
  onClick?(): void;
  disabled?: boolean;
  isLoading?: boolean;
}

interface PrimaryPageAction extends PageAction {
  type?: 'button' | 'submit';
}

interface PageActionsProps {
  primary: PrimaryPageAction;
  secondary?: PageAction;
}

export function PageActions({ primary, secondary }: PageActionsProps) {
  return (
    <Flex gap="space.04" width="100%" data-recipe="page-actions">
      {secondary ? (
        <Button
          type="button"
          variant="outline"
          flex={1}
          disabled={secondary.disabled}
          aria-busy={secondary.isLoading}
          onClick={secondary.onClick}
        >
          {secondary.label}
        </Button>
      ) : null}
      <Button
        type={primary.type ?? 'button'}
        variant="solid"
        flex={1}
        disabled={primary.disabled}
        aria-busy={primary.isLoading}
        onClick={primary.onClick}
      >
        {primary.label}
      </Button>
    </Flex>
  );
}
