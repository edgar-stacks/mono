import { type ReactNode } from 'react';

import { Callout } from '@leather.io/ui';

type PageNoticeTone = 'info' | 'warning' | 'error' | 'success';

interface PageNoticeProps {
  tone?: PageNoticeTone;
  title: string;
  children?: ReactNode;
}

export function PageNotice({ tone = 'info', title, children }: PageNoticeProps) {
  return (
    <Callout variant={tone} title={title}>
      {children}
    </Callout>
  );
}
