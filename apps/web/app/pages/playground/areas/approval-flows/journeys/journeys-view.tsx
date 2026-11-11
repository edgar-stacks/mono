import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router';

import { Box, Flex } from 'leather-styles/jsx';

import { useCanvasSettings } from '../canvas/canvas-settings';
import type { ApprovalRequest, SignerKind } from '../scenarios/approval-model';
import { JourneyActivity } from './journey-activity';
import { JourneyApp } from './journey-app';
import { useJourneyAutomation } from './journey-automation';
import { JourneyControls } from './journey-controls';
import {
  type JourneyDefinition,
  type JourneyVariant,
  findJourney,
  findVariant,
} from './journey-definitions';
import { createRunId, isParticipantSession, prototypeUrl } from './journey-navigation';
import type { JourneyStage } from './journey-state';
import { useJourneyRun } from './journey-store';
import { JourneyStrip } from './journey-strip';
import { JourneyWalletPopover, type PopoverLaunch } from './journey-wallet-popover';
import { JourneyWalletView, describeJourneyResult } from './journey-wallet-views';
import { parseWalletShape } from './journey-world';

const requestStages: JourneyStage[] = ['review', 'device', 'signing', 'broadcasting'];
const startableStages: JourneyStage[] = [
  'idle',
  'connected',
  'signed',
  'confirmed',
  'failed',
  'cancelled',
];

function popoverLaunch(requestOpen: boolean, request: ApprovalRequest): PopoverLaunch {
  if (!requestOpen) return 'none';
  return request.kind === 'connect' ? 'handshake' : 'logo';
}

interface JourneyPrototypeProps {
  runId: string;
  journey: JourneyDefinition;
  variant: JourneyVariant;
  wallet: SignerKind;
  params: URLSearchParams;
}

function JourneyPrototype({ runId, journey, variant, wallet, params }: JourneyPrototypeProps) {
  const [, setParams] = useSearchParams();
  const { direction, confirmMode } = useCanvasSettings();
  const { run, dispatch } = useJourneyRun({
    runId,
    journeyId: journey.id,
    variantId: variant.id,
    wallet,
  });
  const [activityOpen, setActivityOpen] = useState(false);
  const request = variant.buildRequest(wallet);
  const participant = isParticipantSession(params);
  const controlsOpen = !participant && params.get('controls') === 'open';
  const requestOpen = requestStages.includes(run.stage);
  const popoverOpen = requestOpen || activityOpen;
  const activeRequestId = run.request?.id;

  useJourneyAutomation(run, dispatch);

  const dismissPopover = useCallback(() => {
    if (activityOpen) return setActivityOpen(false);
    if (!activeRequestId) return;
    if (run.stage === 'review' || run.stage === 'device') {
      dispatch({ type: 'cancel', runId: run.runId, requestId: activeRequestId });
    }
  }, [activityOpen, activeRequestId, dispatch, run.runId, run.stage]);

  function toggleControls() {
    setParams(
      current => {
        const next = new URLSearchParams(current);
        if (controlsOpen) next.delete('controls');
        else next.set('controls', 'open');
        return next;
      },
      { replace: true }
    );
  }

  function start() {
    setActivityOpen(false);
    dispatch({ type: 'request', runId: run.runId });
  }

  return (
    <Flex direction="column" height="100vh">
      <JourneyStrip
        params={params}
        journey={journey}
        variantId={variant.id}
        wallet={wallet}
        participant={participant}
        controlsOpen={controlsOpen}
        onToggleControls={toggleControls}
      />
      <Flex direction={{ base: 'column', lg: 'row' }} flex="1" minHeight="0">
        <Box position="relative" flex="1" minHeight="0" minWidth="0" overflow="hidden">
          <JourneyApp
            journey={journey}
            request={request}
            result={describeJourneyResult(run, request)}
            canStart={startableStages.includes(run.stage)}
            hasTransactions={run.transactions.length > 0}
            walletBusy={popoverOpen}
            onStart={start}
            onOpenActivity={() => setActivityOpen(true)}
          />
          <JourneyWalletPopover
            open={popoverOpen}
            label={activityOpen && !requestOpen ? 'Leather activity' : request.title}
            launch={popoverLaunch(requestOpen, request)}
            launchKey={activeRequestId ?? 'activity'}
            requester={request.requester}
            onDismiss={dismissPopover}
          >
            {requestOpen ? (
              <JourneyWalletView
                run={run}
                request={request}
                direction={direction}
                confirmMode={confirmMode}
                dispatch={dispatch}
              />
            ) : (
              <JourneyActivity run={run} request={request} />
            )}
          </JourneyWalletPopover>
        </Box>
        {controlsOpen ? (
          <JourneyControls
            params={params}
            run={run}
            request={request}
            dispatch={dispatch}
            onClose={toggleControls}
          />
        ) : null}
      </Flex>
    </Flex>
  );
}

export function JourneysView() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const runId = params.get('run');
  const journey = findJourney(params.get('journey'));
  const variant = findVariant(journey, params.get('variant'));
  const wallet = parseWalletShape(params.get('wallet'));

  useEffect(() => {
    if (runId) return;
    void navigate(
      prototypeUrl(params, { journey: journey.id, variant: variant.id }, createRunId()),
      {
        replace: true,
      }
    );
  }, [journey.id, navigate, params, runId, variant.id]);

  if (!runId) return null;

  return (
    <JourneyPrototype
      key={`${runId}:${journey.id}:${variant.id}:${wallet}`}
      runId={runId}
      journey={journey}
      variant={variant}
      wallet={wallet}
      params={params}
    />
  );
}
