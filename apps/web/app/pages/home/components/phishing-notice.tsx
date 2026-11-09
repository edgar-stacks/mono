import { Flex, styled } from 'leather-styles/jsx';

import { ErrorTriangleIcon } from '@leather.io/ui';

export function PhishingNotice() {
  return (
    <Flex
      role="note"
      alignItems="center"
      gap="space.03"
      px="space.04"
      py="space.03"
      bg="ink.component-background-hover"
      textStyle="label.02"
    >
      <ErrorTriangleIcon variant="small" />
      <styled.p>
        There is an active email phishing 2FA scam. Leather will never send you an email. Do not
        click any links.
      </styled.p>
    </Flex>
  );
}
