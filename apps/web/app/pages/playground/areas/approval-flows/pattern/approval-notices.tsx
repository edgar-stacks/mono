import { Flex, styled } from 'leather-styles/jsx';

import { ErrorTriangleIcon, InfoCircleIcon } from '@leather.io/ui';

import type { JourneyRequest, JourneyRequester } from '../journeys/journey-definitions';

type ApprovalNoticeTone = 'info' | 'warning';

interface ApprovalNotice {
  id: string;
  tone: ApprovalNoticeTone;
  text: string;
}

export function getApprovalNotices(
  request: JourneyRequest,
  requester: JourneyRequester
): ApprovalNotice[] {
  const notices: ApprovalNotice[] = [];
  const isTransaction = request.kind === 'transaction' || request.kind === 'psbt';
  if (!requester.verified) {
    notices.push({
      id: 'unverified',
      tone: 'warning',
      text: `${requester.origin} isn’t a site Leather recognises. Check the address bar before approving.`,
    });
  }
  if (request.isGeneric && request.limits.length === 0) {
    notices.push({
      id: 'no-limits',
      tone: 'warning',
      text: 'No spending limits. Leather can’t tell what this call will move, and nothing stops it moving any asset in this account.',
    });
  }
  if (isTransaction && !request.isGeneric && request.movements.length === 0) {
    notices.push({
      id: 'fee-only',
      tone: 'info',
      text: 'No tokens leave this account. Only the network fee is charged.',
    });
  }
  if (isTransaction && request.mode === 'sign-only' && !request.vaultStep) {
    notices.push({
      id: 'sign-only',
      tone: 'info',
      text: `Sign only. ${requester.name} gets a signed transaction and may broadcast it later; nothing moves until it does.`,
    });
  }
  if (request.kind === 'psbt' && request.limits.length === 0) {
    notices.push({
      id: 'psbt-estimate',
      tone: 'info',
      text: 'Amounts are worked out from the inputs and outputs you sign.',
    });
  }
  if (request.vaultStep === 'propose') {
    notices.push({
      id: 'vault-propose',
      tone: 'info',
      text: 'Proposing signs with your key only. Nothing moves until enough co-signers approve and someone broadcasts.',
    });
  }
  if (request.vaultStep === 'co-sign') {
    notices.push({
      id: 'vault-co-sign',
      tone: 'info',
      text: 'Your signature completes the threshold. The payment still needs a broadcast.',
    });
  }
  return notices;
}

interface ApprovalNoticesProps {
  notices: ApprovalNotice[];
}

export function ApprovalNotices({ notices }: ApprovalNoticesProps) {
  if (notices.length === 0) return null;
  return (
    <Flex direction="column" gap="space.02">
      {notices.map(notice => (
        <Flex
          key={notice.id}
          gap="space.02"
          p="space.03"
          borderRadius="sm"
          bg={
            notice.tone === 'warning'
              ? 'yellow.background-primary'
              : 'ink.component-background-default'
          }
          color="ink.text-primary"
          data-notice={notice.id}
        >
          {notice.tone === 'warning' ? (
            <ErrorTriangleIcon variant="small" />
          ) : (
            <InfoCircleIcon variant="small" />
          )}
          <styled.span textStyle="caption.01">{notice.text}</styled.span>
        </Flex>
      ))}
    </Flex>
  );
}
