import { cva } from 'leather-styles/css';
import { Flex, styled } from 'leather-styles/jsx';

import type { ApprovalNotice } from '../scenarios/approval-scenario.types';

const noticeStyles = cva({
  base: {
    display: 'flex',
    flexDirection: 'column',
    gap: 'space.01',
    p: 'space.03',
    borderRadius: 'sm',
    borderWidth: '1px',
    borderStyle: 'solid',
  },
  variants: {
    tone: {
      info: { bg: 'blue.background-secondary', borderColor: 'blue.border' },
      warning: { bg: 'yellow.background-secondary', borderColor: 'yellow.border' },
      danger: { bg: 'red.background-secondary', borderColor: 'red.border' },
    },
  },
});

const noticeTitleStyles = cva({
  base: { textStyle: 'label.03' },
  variants: {
    tone: {
      info: { color: 'blue.text-primary' },
      warning: { color: 'yellow.text-primary' },
      danger: { color: 'red.text-primary' },
    },
  },
});

interface ApprovalNoticesProps {
  notices: ApprovalNotice[];
}

export function ApprovalNotices({ notices }: ApprovalNoticesProps) {
  if (notices.length === 0) return null;
  return (
    <Flex direction="column" gap="space.02">
      {notices.map(notice => (
        <div
          key={notice.title}
          role={notice.tone === 'info' ? 'note' : 'alert'}
          className={noticeStyles({ tone: notice.tone })}
        >
          <span className={noticeTitleStyles({ tone: notice.tone })}>{notice.title}</span>
          <styled.span textStyle="caption.01" color="ink.text-primary">
            {notice.body}
          </styled.span>
        </div>
      ))}
    </Flex>
  );
}
