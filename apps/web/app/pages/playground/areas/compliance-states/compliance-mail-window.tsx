import { Flex, Stack, styled } from 'leather-styles/jsx';

import { Button } from '@leather.io/ui';

import {
  type ComplianceMailKind,
  createComplianceMail,
  mockMailContext,
} from '../compliance-shared/compliance-content';

interface ComplianceMailWindowProps {
  kind: ComplianceMailKind;
  onClose?(): void;
}

export function ComplianceMailWindow({ kind, onClose }: ComplianceMailWindowProps) {
  const mail = createComplianceMail(kind, { platform: 'extension', ...mockMailContext });
  return (
    <Stack gap="0" height="100%" bg="ink.background-primary">
      <Flex
        justifyContent="space-between"
        alignItems="center"
        px="space.04"
        py="space.03"
        bg="ink.background-secondary"
        borderBottomWidth={1}
        borderColor="ink.border-default"
      >
        <styled.span textStyle="label.02">New message</styled.span>
        <Button size="sm" variant="ghost" onClick={onClose}>
          Close
        </Button>
      </Flex>
      {[
        { label: 'To', value: mail.to },
        { label: 'Subject', value: mail.subject },
      ].map(field => (
        <Flex
          key={field.label}
          gap="space.03"
          px="space.04"
          py="space.03"
          borderBottomWidth={1}
          borderColor="ink.border-default"
        >
          <styled.span textStyle="label.03" color="ink.text-subdued" width="56px">
            {field.label}
          </styled.span>
          <styled.span textStyle="label.03">{field.value}</styled.span>
        </Flex>
      ))}
      <styled.pre flex="1" px="space.04" py="space.04" textStyle="body.02" whiteSpace="pre-wrap">
        {mail.body}
      </styled.pre>
      <Flex px="space.04" py="space.04" borderTopWidth={1} borderColor="ink.border-default">
        <styled.a href={mail.href} textStyle="label.03" textDecoration="underline">
          Open in mail app
        </styled.a>
      </Flex>
    </Stack>
  );
}
