import { useNavigate } from 'react-router';

import { Flex, styled } from 'leather-styles/jsx';

import { Button } from '@leather.io/ui';

import type { ApprovalDirection } from '../directions/direction-types';
import { canvasUrl, createRunId, prototypeUrl } from '../journeys/journey-navigation';
import { ApprovalScreen } from '../pattern/approval-screen';
import {
  type ApprovalScreen as ApprovalScreenEntry,
  approvalScreens,
  approvalSections,
  buildScreenRequest,
} from '../scenarios/approval-screens';
import { CaptureFrame, PopupFrame } from './approval-frames';
import { CanvasLink } from './canvas-link';
import { useCanvasSettings } from './canvas-settings';

function noop() {
  return;
}

interface ScreenPreviewProps {
  screen: ApprovalScreenEntry;
  direction: ApprovalDirection;
}

function ScreenPreview({ screen, direction }: ScreenPreviewProps) {
  return (
    <PopupFrame
      label={`Proposed · ${direction.label}`}
      caption={screen.signerKind === 'ledger' ? 'Ledger account' : 'Software account'}
      interactive={false}
    >
      <ApprovalScreen
        request={buildScreenRequest(screen)}
        direction={direction}
        reviewKey={screen.id}
        interactive={false}
        onApprove={noop}
        onCancel={noop}
      />
    </PopupFrame>
  );
}

interface ScreenCardProps {
  screen: ApprovalScreenEntry;
  direction: ApprovalDirection;
  params: URLSearchParams;
}

function ScreenCard({ screen, direction, params }: ScreenCardProps) {
  const navigate = useNavigate();

  function launchPrototype() {
    void navigate(
      prototypeUrl(
        params,
        {
          journey: screen.journey,
          variant: screen.variant,
          wallet: screen.signerKind,
          returnTo: `?${params.toString()}`,
        },
        createRunId()
      )
    );
  }

  return (
    <Flex
      id={screen.id}
      direction="column"
      gap="space.04"
      p={{ base: 'space.03', md: 'space.05' }}
      borderRadius="md"
      bg="ink.background-secondary"
      scrollMarginTop="96px"
    >
      <Flex
        direction={{ base: 'column', md: 'row' }}
        justifyContent="space-between"
        alignItems={{ base: 'flex-start', md: 'center' }}
        gap="space.03"
      >
        <Flex direction="column" gap="space.01">
          <styled.h3 textStyle="label.01" color="ink.text-primary">
            {screen.title}
          </styled.h3>
          <styled.span textStyle="body.02" color="ink.text-subdued">
            {screen.summary}
          </styled.span>
        </Flex>
        <Flex gap="space.02" flexShrink={0}>
          <CanvasLink to={canvasUrl(params, 'viewer', { screen: screen.id })}>
            Open in viewer
          </CanvasLink>
          <Button size="sm" onClick={launchPrototype}>
            Launch prototype
          </Button>
        </Flex>
      </Flex>
      <Flex gap="space.05" flexWrap="wrap">
        <ScreenPreview screen={screen} direction={direction} />
        <CaptureFrame captureId={screen.captureId} />
      </Flex>
    </Flex>
  );
}

export function ScreenCatalog() {
  const { params, direction } = useCanvasSettings();
  return (
    <Flex
      direction="column"
      gap="space.07"
      px={{ base: 'space.03', md: 'space.06' }}
      py="space.05"
      pb="120px"
    >
      <Flex direction="column" gap="space.03" maxWidth="760px">
        <styled.p textStyle="body.02" color="ink.text-subdued">
          Every approval the extension asks for, proposed in the {direction.label} direction next to
          today’s extension at popup size. Ask of each one: who is asking, which account or vault
          signs, what moves, what it costs, what limits hold, and what happens after signing.
          Illustrative fixtures only.
        </styled.p>
        <styled.nav display="flex" gap="space.02" flexWrap="wrap" aria-label="Approval sections">
          {approvalSections.map(section => (
            <styled.a
              key={section.id}
              href={`#section-${section.id}`}
              textStyle="label.03"
              px="space.03"
              py="space.01"
              borderRadius="round"
              borderWidth="1px"
              borderStyle="solid"
              borderColor="ink.border-default"
              color="ink.text-primary"
              _hover={{ bg: 'ink.component-background-hover' }}
            >
              {section.label}
            </styled.a>
          ))}
        </styled.nav>
      </Flex>
      {approvalSections.map(section => (
        <Flex
          key={section.id}
          id={`section-${section.id}`}
          direction="column"
          gap="space.04"
          scrollMarginTop="96px"
        >
          <styled.h2 textStyle="heading.04" color="ink.text-primary">
            {section.label}
          </styled.h2>
          {approvalScreens
            .filter(screen => screen.section === section.id)
            .map(screen => (
              <ScreenCard key={screen.id} screen={screen} direction={direction} params={params} />
            ))}
        </Flex>
      ))}
    </Flex>
  );
}
