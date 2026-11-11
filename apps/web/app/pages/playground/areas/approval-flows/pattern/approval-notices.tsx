import { Flex, styled } from 'leather-styles/jsx';

import { ErrorTriangleIcon, InfoCircleIcon } from '@leather.io/ui';

import type { ApprovalNotice } from '../scenarios/approval-model';

function NoticeIcon({ tone }: { tone: ApprovalNotice['tone'] }) {
  if (tone === 'info') return <InfoCircleIcon variant="small" />;
  return <ErrorTriangleIcon variant="small" />;
}

const toneStyles = {
  info: { bg: 'ink.background-secondary', color: 'ink.text-primary' },
  warning: { bg: 'yellow.background-secondary', color: 'yellow.text-primary' },
  danger: { bg: 'red.background-secondary', color: 'red.text-primary' },
} as const;

export function ApprovalNotices({ notices }: { notices: ApprovalNotice[] }) {
  if (notices.length === 0) return null;
  return (
    <Flex direction="column" gap="space.02">
      {notices.map(notice => (
        <Flex
          key={notice.text}
          gap="space.02"
          alignItems="flex-start"
          p="space.03"
          borderRadius="sm"
          role={notice.tone === 'danger' ? 'alert' : undefined}
          {...toneStyles[notice.tone]}
        >
          <NoticeIcon tone={notice.tone} />
          <styled.span textStyle="caption.01">{notice.text}</styled.span>
        </Flex>
      ))}
    </Flex>
  );
}
