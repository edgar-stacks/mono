import type { ReactNode } from 'react';

import { Box, Flex } from 'leather-styles/jsx';

import { Button } from '@leather.io/ui';

import type { ApprovalDirection } from '../directions/direction-registry';
import { HandshakeHeader } from '../directions/handshake/handshake-header';
import { ReferenceHeader } from '../directions/reference-headers';
import type { ApprovalNotice, ApprovalRequest } from '../scenarios/approval-scenario.types';
import { ApprovalConfirm } from './approval-confirm';
import { AccountIdentity } from './approval-identity';
import { ApprovalNotices } from './approval-notices';
import {
  ApprovalSection,
  DetailRows,
  FeeRow,
  LimitRows,
  MessageBlock,
  MovementRows,
  PermissionList,
} from './approval-rows';
import { ApprovalSigners } from './approval-signers';

const deviceRejectedNotice: ApprovalNotice = {
  tone: 'danger',
  title: 'Rejected on your Ledger',
  body: 'Nothing was signed. Approve again to retry on the device.',
};

const noLimitsNotice: ApprovalNotice = {
  tone: 'warning',
  title: 'No spending limits',
  body: 'Nothing on-chain stops this request from moving more than shown.',
};

function needsNoLimitsNotice(request: ApprovalRequest) {
  const spends = request.movements.some(movement => movement.direction === 'out');
  return (
    request.chain === 'stacks' &&
    request.kind === 'transaction' &&
    spends &&
    request.limits.length === 0
  );
}

function ApprovalHeader({
  request,
  direction,
  animate,
}: {
  request: ApprovalRequest;
  direction: ApprovalDirection;
  animate: boolean;
}) {
  if (direction.header === 'handshake') {
    return <HandshakeHeader request={request} animate={animate} />;
  }
  return <ReferenceHeader header={direction.header} request={request} />;
}

function Group({
  title,
  grouped,
  children,
}: {
  title: string;
  grouped: boolean;
  children: ReactNode;
}) {
  if (grouped) return <ApprovalSection title={title}>{children}</ApprovalSection>;
  return (
    <Box pt="space.03" borderTopWidth="1px" borderTopStyle="solid" borderColor="ink.border-default">
      {children}
    </Box>
  );
}

interface ApprovalScreenProps {
  request: ApprovalRequest;
  direction: ApprovalDirection;
  requestKey: string;
  animateHeader?: boolean;
  deviceRejected?: boolean;
  interactive?: boolean;
  onConfirm?(): void;
  onCancel?(): void;
}

export function ApprovalScreen({
  request,
  direction,
  requestKey,
  animateHeader = false,
  deviceRejected = false,
  interactive = true,
  onConfirm,
  onCancel,
}: ApprovalScreenProps) {
  const grouped = direction.groupedRows;
  const notices = [
    ...(deviceRejected ? [deviceRejectedNotice] : []),
    ...request.notices,
    ...(needsNoLimitsNotice(request) ? [noLimitsNotice] : []),
  ];
  const fundsRole = request.signer ? 'Funds from' : undefined;

  return (
    <Flex direction="column" height="100%" minHeight={0} bg="ink.background-primary">
      <Flex direction="column" gap="space.05" flex={1} overflowY="auto" p="space.05">
        <ApprovalHeader request={request} direction={direction} animate={animateHeader} />
        <ApprovalNotices notices={notices} />
        <Group title="Account" grouped={grouped}>
          <Flex direction="column" gap="space.03">
            <AccountIdentity account={request.account} chain={request.chain} role={fundsRole} />
            {request.signer ? (
              <AccountIdentity account={request.signer} chain={request.chain} role="Signing with" />
            ) : null}
          </Flex>
        </Group>
        {request.kind === 'connect' ? (
          <Group title={`${request.requester.name} will be able to`} grouped={grouped}>
            <PermissionList permissions={request.permissions} />
          </Group>
        ) : null}
        {request.message ? (
          <Group title="Message" grouped={grouped}>
            <MessageBlock message={request.message} />
          </Group>
        ) : null}
        {request.kind !== 'connect' && request.kind !== 'message' ? (
          <Group title="Estimated balance change" grouped={grouped}>
            <MovementRows movements={request.movements} />
          </Group>
        ) : null}
        {request.limits.length > 0 ? (
          <Group title="Enforced limits" grouped={grouped}>
            <LimitRows limits={request.limits} />
          </Group>
        ) : null}
        {request.fee ? (
          <Group title="Fee" grouped={grouped}>
            <FeeRow fee={request.fee} />
          </Group>
        ) : null}
        {request.signers.length > 0 ? (
          <Group title="Signers" grouped={grouped}>
            <ApprovalSigners signers={request.signers} />
          </Group>
        ) : null}
        {request.details.length > 0 ? (
          <Group title="Details" grouped={grouped}>
            <DetailRows details={request.details} />
          </Group>
        ) : null}
      </Flex>
      <Flex
        gap="space.02"
        p="space.04"
        borderTopWidth="1px"
        borderTopStyle="solid"
        borderColor="ink.border-default"
        bg="ink.background-primary"
      >
        <Box flex={1} minWidth={0}>
          <Button
            type="button"
            variant="outline"
            fullWidth
            disabled={!interactive}
            onClick={() => onCancel?.()}
          >
            Cancel
          </Button>
        </Box>
        <Box flex={1} minWidth={0}>
          <ApprovalConfirm
            label={request.primaryAction}
            requestKey={requestKey}
            mode={direction.confirm}
            disabled={!interactive}
            onConfirm={() => onConfirm?.()}
          />
        </Box>
      </Flex>
    </Flex>
  );
}
