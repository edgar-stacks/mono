import { useEffect } from 'react';

import type { JourneyAction, JourneyOutcome, JourneyRun, JourneyStage } from './journey-state';

const signingDelayMs = 900;
const broadcastDelayMs = 900;
const confirmationDelayMs = 4000;

interface ScheduleInput {
  runId: string;
  requestId: string;
  stage: JourneyStage;
  outcome: JourneyOutcome;
}

function scheduledAction({ runId, requestId, stage, outcome }: ScheduleInput) {
  const scope = { runId, requestId };
  if (stage === 'signing') {
    const action: JourneyAction = { type: 'signed', ...scope };
    return { action, delay: signingDelayMs };
  }
  if (stage === 'broadcasting') {
    const action: JourneyAction =
      outcome === 'broadcast-failure'
        ? { type: 'broadcast-rejected', ...scope }
        : { type: 'broadcast-accepted', ...scope };
    return { action, delay: broadcastDelayMs };
  }
  if (stage === 'pending') {
    const action: JourneyAction =
      outcome === 'chain-failure' ? { type: 'fail', ...scope } : { type: 'confirm', ...scope };
    return { action, delay: confirmationDelayMs };
  }
  return null;
}

export function useJourneyAutomation(run: JourneyRun, dispatch: (action: JourneyAction) => void) {
  const { runId, stage, outcome } = run;
  const requestId = run.request?.id;

  useEffect(() => {
    if (!requestId) return;
    const scheduled = scheduledAction({ runId, requestId, stage, outcome });
    if (!scheduled) return;
    const timer = setTimeout(() => dispatch(scheduled.action), scheduled.delay);
    return () => clearTimeout(timer);
  }, [dispatch, outcome, requestId, runId, stage]);
}
