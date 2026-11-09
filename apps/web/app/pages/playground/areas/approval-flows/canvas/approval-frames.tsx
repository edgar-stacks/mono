import type { ReactNode } from 'react';

import { Box, Flex, styled } from 'leather-styles/jsx';

import type { ApprovalDirection } from '../directions/direction-registry';
import { resolveJourney } from '../journeys/journey-definitions';
import { JourneyWalletView } from '../journeys/journey-wallet-views';
import { deriveJourneyWorld } from '../journeys/journey-world';
import type { ApprovalScreen } from '../scenarios/scenario-types';

const popupWidth = 360;
export const popupHeight = 600;

interface PopupFrameProps {
  label: string;
  children: ReactNode;
  scale?: number;
}

export function PopupFrame({ label, children, scale = 1 }: PopupFrameProps) {
  return (
    <Flex direction="column" gap="space.02" flexShrink={0}>
      <styled.span textStyle="caption.01" color="ink.text-subdued">
        {label}
      </styled.span>
      <Box
        position="relative"
        overflow="hidden"
        style={{ width: popupWidth * scale, height: popupHeight * scale }}
      >
        <Flex
          direction="column"
          position="absolute"
          top={0}
          left={0}
          overflow="hidden"
          borderRadius="md"
          borderWidth="1px"
          borderStyle="solid"
          borderColor="ink.border-default"
          bg="ink.background-primary"
          style={{
            width: popupWidth,
            height: popupHeight,
            transform: scale === 1 ? undefined : `scale(${scale})`,
            transformOrigin: 'top left',
          }}
        >
          {children}
        </Flex>
      </Box>
    </Flex>
  );
}

interface CaptureFrameProps {
  screen: ApprovalScreen;
  scale?: number;
}

export function CaptureFrame({ screen, scale = 1 }: CaptureFrameProps) {
  return (
    <PopupFrame label="Current extension" scale={scale}>
      {screen.capture ? (
        <styled.img
          src={screen.capture}
          alt={`Current extension: ${screen.title}`}
          width="100%"
          height="100%"
          objectFit="contain"
          objectPosition="top"
        />
      ) : (
        <Flex
          flex={1}
          alignItems="center"
          justifyContent="center"
          p="space.06"
          textAlign="center"
          bg="ink.background-secondary"
        >
          <styled.span textStyle="caption.01" color="ink.text-subdued">
            {screen.captureNote ?? 'No capture of the current extension for this screen yet.'}
          </styled.span>
        </Flex>
      )}
    </PopupFrame>
  );
}

interface ScreenPreviewProps {
  screen: ApprovalScreen;
  direction: ApprovalDirection;
}

export function ScreenPreview({ screen, direction }: ScreenPreviewProps) {
  const { definition, variant } = resolveJourney(screen.journeyId, screen.variantId);
  return (
    <JourneyWalletView
      definition={definition}
      request={variant.request}
      stage={screen.stage}
      failure={screen.failure ?? null}
      world={deriveJourneyWorld(screen.wallet, [])}
      direction={direction}
      requestKey={screen.id}
      ledgerState={screen.ledgerState}
      interactive={false}
    />
  );
}
