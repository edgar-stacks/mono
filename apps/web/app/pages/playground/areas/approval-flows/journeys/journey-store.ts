import { useCallback, useEffect, useState } from 'react';

import { z } from 'zod';

import type { ResolvedJourney } from './journey-definitions';
import {
  type JourneyAction,
  type JourneyRun,
  type JourneyTransaction,
  createJourneyRun,
  isJourneyRun,
  parseJourneyRun,
  parseJourneyTransactions,
  reduceJourneyRun,
} from './journey-state';

const storageKey = 'leather.playground.approval-flows.session';

interface JourneySession {
  run: JourneyRun;
  history: JourneyTransaction[];
}

function readStoredSession(runId: string) {
  if (typeof window === 'undefined') return null;
  try {
    const raw: unknown = JSON.parse(window.sessionStorage.getItem(storageKey) ?? 'null');
    const stored = z.object({ run: z.unknown(), history: z.unknown() }).safeParse(raw);
    if (!stored.success) return null;
    const history = parseJourneyTransactions(stored.data.history);
    if (!isJourneyRun(stored.data.run)) return { run: null, history };
    const run = parseJourneyRun(stored.data.run);
    return { run: run?.runId === runId ? run : null, history };
  } catch {
    return null;
  }
}

function settledTransactions(run: JourneyRun) {
  return run.transactions.filter(transaction => transaction.status !== 'pending');
}

function matchesJourney(run: JourneyRun, journey: ResolvedJourney) {
  return (
    run.familyId === journey.family.id &&
    run.variantId === journey.variant.id &&
    run.wallet === journey.wallet
  );
}

export function useJourneySession(runId: string, journey: ResolvedJourney) {
  const [session, setSession] = useState<JourneySession>(() => {
    const stored = readStoredSession(runId);
    const history = stored?.history ?? [];
    if (stored?.run && matchesJourney(stored.run, journey)) return { run: stored.run, history };
    return { run: createJourneyRun(runId, journey), history };
  });

  if (session.run.runId !== runId || !matchesJourney(session.run, journey)) {
    setSession({
      run: createJourneyRun(runId, journey),
      history: [...session.history, ...settledTransactions(session.run)],
    });
  }

  useEffect(() => {
    window.sessionStorage.setItem(storageKey, JSON.stringify(session));
  }, [session]);

  const dispatch = useCallback((action: JourneyAction) => {
    setSession(current => ({ ...current, run: reduceJourneyRun(current.run, action) }));
  }, []);

  const resetHistory = useCallback(() => {
    setSession(current => ({ run: createJourneyRun(current.run.runId, journey), history: [] }));
  }, [journey]);

  return { run: session.run, history: session.history, dispatch, resetHistory };
}
