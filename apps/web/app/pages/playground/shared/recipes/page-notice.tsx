import { type ReactNode } from 'react';

import { Callout } from '@leather.io/ui';

interface PageNoticeProps {
  variant: 'info' | 'warning' | 'error' | 'success';
  title: string;
  children?: ReactNode;
}

export function PageNotice({ variant, title, children }: PageNoticeProps) {
  return (
    <Callout variant={variant} title={title} data-recipe="page-notice">
      {children}
    </Callout>
  );
}
