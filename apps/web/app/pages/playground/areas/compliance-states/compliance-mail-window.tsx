import { Box, Flex, Stack, styled } from 'leather-styles/jsx';

import { Button } from '@leather.io/ui';

import { type MailDraft, openMailDraft } from '../compliance-shared/compliance-content';

const mailWindowWidth = '560px';
const mailWindowHeight = '480px';

interface MailFieldProps {
  label: string;
  value: string;
}

function MailField({ label, value }: MailFieldProps) {
  return (
    <Flex gap="space.03" py="space.02" borderBottomWidth={1} borderColor="ink.border-transparent">
      <styled.span textStyle="label.03" color="ink.text-subdued" width="64px" flexShrink={0}>
        {label}
      </styled.span>
      <styled.span textStyle="label.03" color="ink.text-primary">
        {value}
      </styled.span>
    </Flex>
  );
}

interface MailWindowProps {
  draft: MailDraft;
}

export function MailWindow({ draft }: MailWindowProps) {
  return (
    <Flex
      direction="column"
      width={mailWindowWidth}
      height={mailWindowHeight}
      flexShrink={0}
      overflow="hidden"
      borderRadius="md"
      borderWidth={1}
      borderColor="ink.border-default"
      bg="ink.background-primary"
      boxShadow="0 12px 32px rgba(0,0,0,0.16)"
    >
      <Flex
        alignItems="center"
        justifyContent="space-between"
        height="36px"
        px="space.04"
        flexShrink={0}
        bg="ink.background-secondary"
      >
        <styled.span textStyle="label.03" color="ink.text-subdued">
          New message
        </styled.span>
        <Button size="sm" variant="ghost" onClick={() => openMailDraft(draft)}>
          Open in mail app
        </Button>
      </Flex>
      <Stack gap="0" px="space.04" flex={1} minHeight={0} overflowY="auto">
        <MailField label="To" value={draft.to} />
        <MailField label="Subject" value={draft.subject} />
        <Box py="space.03">
          <styled.pre
            textStyle="body.02"
            color="ink.text-primary"
            whiteSpace="pre-wrap"
            fontFamily="inherit"
          >
            {draft.body}
          </styled.pre>
        </Box>
      </Stack>
    </Flex>
  );
}
