import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router';

import { Flex } from 'leather-styles/jsx';

import type { ApprovalDirection } from '../directions/direction-registry';
import { JourneyActivity } from './journey-activity';
import { JourneyAppSurface } from './journey-app-surface';
import { JourneyControls, type NetworkResult } from './journey-controls';
import { type JourneyDefinition, type JourneyVariant, resolveJourney } from './journey-definitions';
import { JourneyLaunch } from './journey-launch';
import {
  areControlsOpen,
  createRunId,
  isParticipantMode,
  parseWalletKind,
  prototypeUrl,
} from './journey-navigation';
import { type JourneyEvent, isRequestOpen } from './journey-state';
import { useJourneyRun } from './journey-store';
import { JourneyStrip, type JourneyTab } from './journey-strip';
import { JourneyWalletPopover } from './journey-wallet-popover';
import { JourneyWalletView } from './journey-wallet-views';
import { type JourneyWalletKind, deriveJourneyWorld } from './journey-world';

const submitDelayMs = 900;
const confirmDelayMs = 1_800;

type RequestEventType = Exclude<JourneyEvent['type'], 'open-request'>;

interface JourneyRunnerProps {
  params: URLSearchParams;
  definition: JourneyDefinition;
  variant: JourneyVariant;
  wallet: JourneyWalletKind;
  runId: string;
  direction: ApprovalDirection;
}

function JourneyRunner({
  params,
  definition,
  variant,
  wallet,
  runId,
  direction,
}: JourneyRunnerProps) {
  const request = variant.request;
  const [run, dispatch] = useJourneyRun({
    runId,
    journeyId: definition.id,
    variantId: variant.id,
    wallet,
  });
  const [tab, setTab] = useState<JourneyTab>('app');
  const [isPopoverOpen, setIsPopoverOpen] = useState(() => isRequestOpen(run));
  const [launchedRequestId, setLaunchedRequestId] = useState(() => run.requestId);
  const [networkResult, setNetworkResult] = useState<NetworkResult>('success');
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const world = useMemo(() => deriveJourneyWorld(wallet, run.outcomes), [wallet, run.outcomes]);
  const isParticipant = isParticipantMode(params);
  const controlsOpen = areControlsOpen(params) && !isParticipant;
  const effectiveResult: NetworkResult = isParticipant ? 'success' : networkResult;
  const isLaunching =
    isPopoverOpen && run.requestId !== null && launchedRequestId !== run.requestId;

  useEffect(() => {
    if (run.requestId === null) return;
    const ref = { runId: run.runId, revision: run.revision, requestId: run.requestId };
    if (run.stage === 'broadcasting') {
      const timer = setTimeout(
        () =>
          dispatch({ ...ref, type: effectiveResult === 'fail-broadcast' ? 'fail' : 'submitted' }),
        submitDelayMs
      );
      return () => clearTimeout(timer);
    }
    if (run.stage === 'pending') {
      const timer = setTimeout(
        () => dispatch({ ...ref, type: effectiveResult === 'fail-chain' ? 'fail' : 'confirm' }),
        confirmDelayMs
      );
      return () => clearTimeout(timer);
    }
    return;
  }, [run.runId, run.revision, run.requestId, run.stage, effectiveResult, dispatch]);

  const finishLaunch = useCallback(() => setLaunchedRequestId(run.requestId), [run.requestId]);

  function send(type: RequestEventType) {
    if (run.requestId === null) return;
    dispatch({ type, runId: run.runId, revision: run.revision, requestId: run.requestId });
  }

  function start() {
    dispatch({ type: 'open-request', runId: run.runId, revision: run.revision });
    setTab('app');
    setIsPopoverOpen(true);
  }

  function cancelAndClose() {
    send('cancel');
    setIsPopoverOpen(false);
  }

  function dismiss() {
    if (run.stage === 'reviewing' || run.stage === 'awaiting-device') {
      cancelAndClose();
      return;
    }
    setIsPopoverOpen(false);
  }

  const requestKey = `${run.runId}:${run.requestId ?? 0}:${run.stage === 'reviewing' ? run.revision : 'held'}`;

  return (
    <Flex direction="column" minHeight="100vh" data-journey={definition.id} data-stage={run.stage}>
      <JourneyStrip
        params={params}
        definition={definition}
        variant={variant}
        isParticipant={isParticipant}
        controlsOpen={controlsOpen}
        tab={tab}
        onTab={setTab}
      />
      <Flex flex={1} direction={{ base: 'column', md: 'row' }}>
        <Flex flex={1} direction="column">
          {tab === 'app' ? (
            <JourneyAppSurface
              definition={definition}
              request={request}
              run={run}
              triggerRef={triggerRef}
              onStart={start}
              onShowActivity={() => setTab('activity')}
            />
          ) : (
            <JourneyActivity
              world={world}
              stage={run.stage}
              pending={{ title: request.activityTitle, accountId: request.accountId }}
            />
          )}
        </Flex>
        {controlsOpen ? (
          <JourneyControls
            params={params}
            run={run}
            networkResult={networkResult}
            onNetworkResult={setNetworkResult}
          />
        ) : null}
      </Flex>
      <JourneyWalletPopover
        isOpen={isPopoverOpen && run.requestId !== null}
        label={`Leather: ${request.title}`}
        returnFocusRef={triggerRef}
        onDismiss={dismiss}
      >
        {isLaunching ? (
          <JourneyLaunch
            kind={request.kind === 'connect' ? 'handshake' : 'logo'}
            requester={definition.requester}
            onDone={finishLaunch}
          />
        ) : (
          <JourneyWalletView
            definition={definition}
            request={request}
            stage={run.stage}
            failure={run.failure}
            world={world}
            direction={direction}
            requestKey={requestKey}
            onApprove={() => send('approve')}
            onCancel={cancelAndClose}
            onDeviceApprove={() => send('device-approve')}
            onDeviceReject={() => send('device-reject')}
            onRetry={() => send('retry')}
            onClose={() => setIsPopoverOpen(false)}
          />
        )}
      </JourneyWalletPopover>
    </Flex>
  );
}

interface JourneyPrototypeProps {
  params: URLSearchParams;
  direction: ApprovalDirection;
}

export function JourneyPrototype({ params, direction }: JourneyPrototypeProps) {
  const navigate = useNavigate();
  const { definition, variant } = resolveJourney(params.get('journey'), params.get('variant'));
  const wallet = parseWalletKind(params);
  const runId = params.get('run');

  useEffect(() => {
    if (runId) return;
    void navigate(
      prototypeUrl(params, { journeyId: definition.id, variantId: variant.id }, createRunId()),
      { replace: true }
    );
  }, [runId, params, definition.id, variant.id, navigate]);

  if (!runId) return null;

  return (
    <JourneyRunner
      key={`${runId}:${definition.id}:${variant.id}:${wallet}`}
      params={params}
      definition={definition}
      variant={variant}
      wallet={wallet}
      runId={runId}
      direction={direction}
    />
  );
}
