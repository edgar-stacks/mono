import type { ReactNode } from 'react';

import { ComplianceFrame, ComplianceVariant } from '../compliance-shared/compliance-frames';

interface MobileVariantProps {
  label: string;
  note?: string;
  children: ReactNode;
}

export function MobileVariant({ label, note, children }: MobileVariantProps) {
  return (
    <ComplianceVariant label={label} note={note}>
      <ComplianceFrame kind="mobile">{children}</ComplianceFrame>
    </ComplianceVariant>
  );
}
