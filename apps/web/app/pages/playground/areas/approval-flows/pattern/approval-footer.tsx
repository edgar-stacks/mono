import { Flex, styled } from 'leather-styles/jsx';

import { Button } from '@leather.io/ui';

import {
  type ApprovalRequest,
  approveLabel,
  needsDeviceSignature,
} from '../scenarios/approval-model';
import { ApprovalConfirm } from './approval-confirm';

export type ConfirmMode = 'press' | 'hold';

interface ApprovalFooterProps {
  request: ApprovalRequest;
  reviewKey: string;
  confirmMode?: ConfirmMode;
  onApprove(): void;
  onCancel(): void;
}

function confirmLabel(request: ApprovalRequest) {
  if (needsDeviceSignature(request)) return 'Continue on Ledger';
  return approveLabel(request);
}

export function ApprovalFooter({
  request,
  reviewKey,
  confirmMode = 'press',
  onApprove,
  onCancel,
}: ApprovalFooterProps) {
  return (
    <Flex
      direction="column"
      gap="space.03"
      p="space.04"
      borderTopWidth="1px"
      borderTopStyle="solid"
      borderColor="ink.border-transparent"
      bg="ink.background-primary"
    >
      <Flex gap="space.02">
        <Button variant="outline" size="lg" flex="1" onClick={onCancel}>
          Cancel
        </Button>
        <ApprovalConfirm
          label={confirmLabel(request)}
          reviewKey={reviewKey}
          mode={confirmMode}
          onConfirm={onApprove}
        />
      </Flex>
    </Flex>
  );
}

export function AfterApproval({ request }: { request: ApprovalRequest }) {
  return (
    <Flex direction="column" gap="space.01">
      <styled.span textStyle="label.03" color="ink.text-subdued">
        After you approve
      </styled.span>
      <styled.p textStyle="caption.01" color="ink.text-primary">
        {request.afterApproval}
      </styled.p>
    </Flex>
  );
}
