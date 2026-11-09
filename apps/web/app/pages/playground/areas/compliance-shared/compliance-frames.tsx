import type { ReactNode } from 'react';

import { Box, Flex, Stack, styled } from 'leather-styles/jsx';

export type ComplianceFrameKind = 'popup' | 'request' | 'full-page' | 'mobile';

interface ComplianceFrameProps {
  kind: ComplianceFrameKind;
  origin?: string;
  children: ReactNode;
}

const frameSizes = {
  popup: { width: '360px', height: '600px' },
  request: { width: '390px', height: '640px' },
  'full-page': { width: '760px', height: '600px' },
  mobile: { width: '375px', height: '780px' },
} satisfies Record<ComplianceFrameKind, { width: string; height: string }>;

const windowControlColors = ['#ff5f57', '#febc2e', '#28c840'];

interface WindowBarProps {
  label: string;
}

function WindowBar({ label }: WindowBarProps) {
  return (
    <Flex
      alignItems="center"
      gap="space.02"
      px="space.03"
      height="32px"
      bg="ink.background-secondary"
      borderBottomWidth={1}
      borderColor="ink.border-default"
      flexShrink={0}
    >
      <Flex gap="space.01">
        {windowControlColors.map(color => (
          <Box
            key={color}
            width="10px"
            height="10px"
            borderRadius="round"
            style={{ background: color }}
          />
        ))}
      </Flex>
      <styled.span textStyle="caption.02" color="ink.text-subdued" truncate>
        {label}
      </styled.span>
    </Flex>
  );
}

function MobileStatusBar() {
  return (
    <Flex
      justifyContent="space-between"
      alignItems="center"
      px="space.06"
      pt="space.03"
      height="44px"
      flexShrink={0}
    >
      <styled.span textStyle="label.03">9:41</styled.span>
      <Box width="96px" height="26px" borderRadius="round" bg="ink.text-primary" />
      <styled.span textStyle="label.03">100%</styled.span>
    </Flex>
  );
}

export function ComplianceFrame({ kind, origin, children }: ComplianceFrameProps) {
  const size = frameSizes[kind];

  if (kind === 'mobile') {
    return (
      <Stack
        gap="0"
        style={size}
        borderWidth={8}
        borderColor="ink.text-primary"
        borderRadius="44px"
        overflow="hidden"
        bg="ink.background-primary"
        flexShrink={0}
      >
        <MobileStatusBar />
        <Box flex="1" minHeight="0" position="relative">
          {children}
        </Box>
        <Flex justifyContent="center" py="space.02" flexShrink={0}>
          <Box width="134px" height="5px" borderRadius="round" bg="ink.text-primary" />
        </Flex>
      </Stack>
    );
  }

  return (
    <Stack
      gap="0"
      style={size}
      borderWidth={1}
      borderColor="ink.border-default"
      borderRadius="sm"
      overflow="hidden"
      bg="ink.background-primary"
      boxShadow="0 12px 32px rgba(0, 0, 0, 0.12)"
      flexShrink={0}
    >
      {kind === 'request' && <WindowBar label={origin ?? 'Leather'} />}
      {kind === 'full-page' && <WindowBar label="chrome-extension://leather/index.html#/" />}
      <Box flex="1" minHeight="0" position="relative">
        {kind === 'full-page' ? (
          <Flex justifyContent="center" height="100%" bg="ink.background-secondary">
            <Box width="440px" height="100%" bg="ink.background-primary" position="relative">
              {children}
            </Box>
          </Flex>
        ) : (
          children
        )}
      </Box>
    </Stack>
  );
}

interface ComplianceVariantProps {
  label: string;
  note?: string;
  children: ReactNode;
}

export function ComplianceVariant({ label, note, children }: ComplianceVariantProps) {
  return (
    <Stack gap="space.03" flexShrink={0}>
      <Stack gap="space.01" maxWidth="360px">
        <styled.h4 textStyle="label.02">{label}</styled.h4>
        {note && (
          <styled.p textStyle="caption.01" color="ink.text-subdued">
            {note}
          </styled.p>
        )}
      </Stack>
      {children}
    </Stack>
  );
}
