import { Flex, styled } from 'leather-styles/jsx';

import { Button } from '@leather.io/ui';

import { ApprovalConfirm } from './approval-confirm';

interface ApprovalFooterProps {
  effect: string;
  confirmLabel: string;
  requestKey: string;
  hold: boolean;
  interactive: boolean;
  onApprove?(): void;
  onCancel?(): void;
}

export function ApprovalFooter({
  effect,
  confirmLabel,
  requestKey,
  hold,
  interactive,
  onApprove,
  onCancel,
}: ApprovalFooterProps) {
  return (
    <Flex
      direction="column"
      gap="space.03"
      p="space.04"
      borderTopWidth="1px"
      borderStyle="solid"
      borderColor="ink.border-default"
      bg="ink.background-primary"
    >
      <styled.p textStyle="caption.01" color="ink.text-subdued" data-effect>
        {effect}
      </styled.p>
      <Flex gap="space.02">
        <Button variant="outline" flex={1} onClick={onCancel} disabled={!interactive}>
          Cancel
        </Button>
        <ApprovalConfirm
          label={confirmLabel}
          requestKey={requestKey}
          hold={hold}
          disabled={!interactive}
          onConfirm={() => onApprove?.()}
        />
      </Flex>
    </Flex>
  );
}
