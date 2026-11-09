import type { ReactNode } from 'react';

import { Box } from 'leather-styles/jsx';
import { OutdatedExtensionCallout } from '~/features/multisig/extension/outdated-extension-callout';
import { Page } from '~/layouts/page/page';

interface MultisigPageProps {
  title?: ReactNode;
  backTo?: string;
  onBack?(): void;
  maxWidth?: string;
  children: ReactNode;
  testId?: string;
}

export function MultisigPage({
  title,
  backTo,
  onBack,
  maxWidth,
  children,
  testId,
}: MultisigPageProps) {
  return (
    <Page data-testid={testId}>
      <Page.Header title={title} backTo={backTo} onBack={onBack} />
      <OutdatedExtensionCallout />
      <Box mt="space.08" maxWidth={maxWidth} mx="auto">
        {children}
      </Box>
    </Page>
  );
}
