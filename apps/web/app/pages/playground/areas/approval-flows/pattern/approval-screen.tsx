import { Flex } from 'leather-styles/jsx';

import type { ApprovalDirection } from '../directions/direction-types';
import type { ApprovalRequest } from '../scenarios/approval-model';
import { AfterApproval, ApprovalFooter, type ConfirmMode } from './approval-footer';
import { SignerIdentity, VaultIdentity } from './approval-identity';
import { ApprovalNotices } from './approval-notices';
import { ApprovalQueue } from './approval-queue';
import { ApprovalSigners } from './approval-signers';

function detailsTitle(request: ApprovalRequest) {
  if (request.kind === 'connect') return 'Access';
  if (request.kind === 'message') return 'Message';
  return 'Transaction';
}

function signerLabel(request: ApprovalRequest) {
  if (request.kind === 'connect') return 'Sharing';
  if (request.vault) return 'Your signature from';
  return 'Signing with';
}

interface ApprovalScreenProps {
  request: ApprovalRequest;
  direction: ApprovalDirection;
  reviewKey: string;
  interactive?: boolean;
  confirmMode?: ConfirmMode;
  queue?: { position: number; total: number };
  onApprove(): void;
  onCancel(): void;
}

export function ApprovalScreen({
  request,
  direction,
  reviewKey,
  interactive = true,
  confirmMode,
  queue,
  onApprove,
  onCancel,
}: ApprovalScreenProps) {
  const { Header, Rows, Section } = direction;
  return (
    <Flex direction="column" height="100%" minHeight="0" bg="ink.background-primary">
      <Flex direction="column" gap="space.04" p="space.04" flex="1" minHeight="0" overflowY="auto">
        {queue ? <ApprovalQueue position={queue.position} total={queue.total} /> : null}
        <Header request={request} interactive={interactive} replayKey={reviewKey} />
        <ApprovalNotices notices={request.notices} />
        <Section title={request.vault ? 'Accounts' : 'Account'}>
          <Flex direction="column" gap="space.03" py="space.01">
            {request.vault ? <VaultIdentity vault={request.vault} /> : null}
            <SignerIdentity signer={request.signer} label={signerLabel(request)} />
          </Flex>
        </Section>
        <Section title={detailsTitle(request)}>
          <Rows request={request} />
        </Section>
        {request.vault ? (
          <Section title="Vault signatures">
            <ApprovalSigners vault={request.vault} />
          </Section>
        ) : null}
        <AfterApproval request={request} />
      </Flex>
      <ApprovalFooter
        request={request}
        reviewKey={reviewKey}
        confirmMode={confirmMode}
        onApprove={onApprove}
        onCancel={onCancel}
      />
    </Flex>
  );
}
