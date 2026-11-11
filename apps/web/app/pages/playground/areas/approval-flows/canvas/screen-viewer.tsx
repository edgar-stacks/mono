import { useState } from 'react';
import { useNavigate } from 'react-router';

import { Flex, styled } from 'leather-styles/jsx';

import { Button } from '@leather.io/ui';

import { canvasUrl, createRunId, prototypeUrl } from '../journeys/journey-navigation';
import { ApprovalScreen } from '../pattern/approval-screen';
import {
  approvalScreens,
  approvalSections,
  buildScreenRequest,
  findScreen,
} from '../scenarios/approval-screens';
import { CaptureFrame, PopupFrame } from './approval-frames';
import { CanvasLink } from './canvas-link';
import { useCanvasSettings } from './canvas-settings';
import { IssuesPanel } from './issues-panel';

export function ScreenViewer() {
  const navigate = useNavigate();
  const { params, direction, confirmMode, update } = useCanvasSettings();
  const screen = findScreen(params.get('screen')) ?? approvalScreens[0];
  const request = buildScreenRequest(screen);
  const [replay, setReplay] = useState(0);
  const [lastAction, setLastAction] = useState<string | null>(null);
  const index = approvalScreens.indexOf(screen);
  const previous = approvalScreens[index - 1];
  const next = approvalScreens[index + 1];
  const reviewKey = `${screen.id}:${direction.id}:${replay}`;

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

  function replayScreen() {
    setLastAction(null);
    setReplay(value => value + 1);
  }

  return (
    <Flex
      direction="column"
      gap="space.05"
      px={{ base: 'space.03', md: 'space.06' }}
      py="space.05"
      pb="120px"
    >
      <Flex
        direction={{ base: 'column', md: 'row' }}
        gap="space.03"
        alignItems={{ base: 'stretch', md: 'center' }}
        flexWrap="wrap"
      >
        <styled.select
          aria-label="Screen"
          value={screen.id}
          onChange={event => update('screen', event.target.value)}
          textStyle="label.02"
          px="space.03"
          py="space.02"
          borderRadius="sm"
          borderWidth="1px"
          borderStyle="solid"
          borderColor="ink.border-default"
          bg="ink.background-primary"
          color="ink.text-primary"
        >
          {approvalSections.map(section => (
            <optgroup key={section.id} label={section.label}>
              {approvalScreens
                .filter(candidate => candidate.section === section.id)
                .map(candidate => (
                  <option key={candidate.id} value={candidate.id}>
                    {candidate.title}
                  </option>
                ))}
            </optgroup>
          ))}
        </styled.select>
        <Flex gap="space.02" flexWrap="wrap">
          {previous ? (
            <CanvasLink to={canvasUrl(params, 'viewer', { screen: previous.id })}>
              Previous
            </CanvasLink>
          ) : null}
          {next ? (
            <CanvasLink to={canvasUrl(params, 'viewer', { screen: next.id })}>Next</CanvasLink>
          ) : null}
          <Button variant="outline" size="sm" onClick={replayScreen}>
            Replay
          </Button>
          <Button size="sm" onClick={launchPrototype}>
            Launch prototype
          </Button>
        </Flex>
      </Flex>
      <Flex direction="column" gap="space.01" maxWidth="760px">
        <styled.h2 textStyle="heading.04" color="ink.text-primary">
          {screen.title}
        </styled.h2>
        <styled.p textStyle="body.02" color="ink.text-subdued">
          {screen.summary} {direction.summary}
        </styled.p>
      </Flex>
      <Flex gap="space.06" flexWrap="wrap" alignItems="flex-start">
        <Flex direction="column" gap="space.02" width="100%" maxWidth="390px">
          <PopupFrame
            label={`Proposed · ${direction.label}`}
            caption={screen.signerKind === 'ledger' ? 'Ledger account' : 'Software account'}
          >
            <ApprovalScreen
              key={reviewKey}
              request={request}
              direction={direction}
              reviewKey={reviewKey}
              confirmMode={confirmMode}
              onApprove={() =>
                setLastAction('Approved. Launch the prototype to follow what happens next.')
              }
              onCancel={() => setLastAction('Cancelled. The app would hear that you declined.')}
            />
          </PopupFrame>
          <styled.span
            role="status"
            textStyle="caption.01"
            color="ink.text-subdued"
            minHeight="20px"
          >
            {lastAction}
          </styled.span>
        </Flex>
        <CaptureFrame captureId={screen.captureId} />
        <IssuesPanel request={request} />
      </Flex>
    </Flex>
  );
}
