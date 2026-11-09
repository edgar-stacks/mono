import type { ReactNode } from 'react';

import { Flex, Stack, styled } from 'leather-styles/jsx';

interface ComplianceSectionProps {
  id: string;
  title: string;
  description: string;
  children: ReactNode;
}

export function ComplianceSection({ id, title, description, children }: ComplianceSectionProps) {
  return (
    <Stack id={id} gap="space.06" scrollMarginTop="80px">
      <Stack gap="space.02" maxWidth="70ch">
        <styled.h2 textStyle="heading.04">{title}</styled.h2>
        <styled.p textStyle="body.02" color="ink.text-subdued">
          {description}
        </styled.p>
      </Stack>
      {children}
    </Stack>
  );
}

interface PlatformBoardProps {
  label: string;
  children: ReactNode;
}

export function PlatformBoard({ label, children }: PlatformBoardProps) {
  return (
    <Stack gap="space.03">
      <styled.h3 textStyle="label.01">{label}</styled.h3>
      <Flex
        gap="space.07"
        flexWrap="wrap"
        alignItems="flex-start"
        p="space.06"
        borderRadius="md"
        bg="ink.background-secondary"
        overflowX="auto"
      >
        {children}
      </Flex>
    </Stack>
  );
}

interface VariantProps {
  label: string;
  note?: string;
  children: ReactNode;
}

export function Variant({ label, note, children }: VariantProps) {
  return (
    <Stack gap="space.03">
      <Stack gap="space.01">
        <styled.span textStyle="label.02">{label}</styled.span>
        {note ? (
          <styled.span textStyle="caption.01" color="ink.text-subdued" maxWidth="44ch">
            {note}
          </styled.span>
        ) : null}
      </Stack>
      {children}
    </Stack>
  );
}
