import { Box, Flex, Stack, styled } from 'leather-styles/jsx';

import { complianceEmail } from '../compliance-shared/compliance-content';

interface MailFieldProps {
  label: string;
  value: string;
}

function MailField({ label, value }: MailFieldProps) {
  return (
    <Flex gap="space.03" py="space.02" borderBottom="default">
      <styled.span textStyle="label.03" color="ink.text-subdued" width="64px" flexShrink={0}>
        {label}
      </styled.span>
      <styled.span textStyle="label.03">{value}</styled.span>
    </Flex>
  );
}

export function MailWindow() {
  const email = complianceEmail('dispute', 'extension');
  return (
    <Flex
      direction="column"
      width="560px"
      height="520px"
      overflow="hidden"
      bg="ink.background-primary"
      borderWidth="1px"
      borderStyle="solid"
      borderColor="ink.border-default"
      borderRadius="md"
      boxShadow="0 12px 32px rgba(0, 0, 0, 0.12)"
    >
      <Flex
        alignItems="center"
        justifyContent="center"
        height="32px"
        bg="ink.background-secondary"
        borderBottom="default"
      >
        <styled.span textStyle="caption.02" color="ink.text-subdued">
          New message
        </styled.span>
      </Flex>
      <Stack gap="0" px="space.05" pt="space.02">
        <MailField label="To" value={email.to} />
        <MailField label="Subject" value={email.subject} />
      </Stack>
      <Box flex={1} px="space.05" py="space.04" overflowY="auto">
        <styled.pre textStyle="body.02" whiteSpace="pre-wrap" fontFamily="inherit">
          {email.body}
        </styled.pre>
      </Box>
    </Flex>
  );
}
