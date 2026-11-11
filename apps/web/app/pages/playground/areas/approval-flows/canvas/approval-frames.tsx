import type { ReactNode } from 'react';

import { Box, Flex, styled } from 'leather-styles/jsx';

import { LeatherLogomarkIcon } from '@leather.io/ui';

import { captureFor } from '../captures/capture-registry';

export const popupWidth = 390;
export const popupHeight = 600;

interface FrameLabelProps {
  label: string;
  caption?: string;
}

function FrameLabel({ label, caption }: FrameLabelProps) {
  return (
    <Flex justifyContent="space-between" alignItems="baseline" gap="space.02">
      <styled.span textStyle="label.03" color="ink.text-primary">
        {label}
      </styled.span>
      {caption ? (
        <styled.span textStyle="caption.02" color="ink.text-subdued">
          {caption}
        </styled.span>
      ) : null}
    </Flex>
  );
}

const frameStyles = {
  width: '100%',
  maxWidth: `${popupWidth}px`,
  height: `${popupHeight}px`,
  borderRadius: 'md',
  borderWidth: '1px',
  borderStyle: 'solid',
  borderColor: 'ink.border-default',
  overflow: 'hidden',
  bg: 'ink.background-primary',
} as const;

interface PopupFrameProps {
  label?: string;
  caption?: string;
  interactive?: boolean;
  children: ReactNode;
}

export function PopupFrame({ label, caption, interactive = true, children }: PopupFrameProps) {
  return (
    <Flex direction="column" gap="space.02" width="100%" maxWidth={`${popupWidth}px`}>
      {label ? <FrameLabel label={label} caption={caption} /> : null}
      <Flex direction="column" {...frameStyles} inert={!interactive}>
        <PopupChrome />
        <Box flex="1" minHeight="0">
          {children}
        </Box>
      </Flex>
    </Flex>
  );
}

export function PopupChrome() {
  return (
    <Flex
      alignItems="center"
      justifyContent="space-between"
      px="space.04"
      height="48px"
      flexShrink={0}
      borderBottomWidth="1px"
      borderBottomStyle="solid"
      borderColor="ink.border-transparent"
    >
      <Box color="ink.text-primary">
        <LeatherLogomarkIcon width="72" height="16" aria-label="Leather" />
      </Box>
      <styled.span
        textStyle="caption.02"
        color="ink.text-subdued"
        px="space.02"
        borderRadius="xs"
        borderWidth="1px"
        borderStyle="solid"
        borderColor="ink.border-default"
      >
        Mainnet
      </styled.span>
    </Flex>
  );
}

interface CaptureFrameProps {
  captureId?: string;
}

export function CaptureFrame({ captureId }: CaptureFrameProps) {
  const capture = captureFor(captureId);
  return (
    <Flex direction="column" gap="space.02" width="100%" maxWidth={`${popupWidth}px`}>
      <FrameLabel label="Current extension" caption={capture?.caption ?? 'No capture'} />
      <Flex
        {...frameStyles}
        alignItems="center"
        justifyContent="center"
        bg="ink.background-secondary"
      >
        {capture ? (
          <styled.img
            src={capture.src}
            alt={`Current extension: ${capture.caption}`}
            width="100%"
            height="100%"
            objectFit="cover"
            objectPosition="top"
          />
        ) : (
          <styled.span
            textStyle="caption.01"
            color="ink.text-subdued"
            p="space.05"
            textAlign="center"
          >
            Today’s extension has no dedicated screen for this request.
          </styled.span>
        )}
      </Flex>
    </Flex>
  );
}
