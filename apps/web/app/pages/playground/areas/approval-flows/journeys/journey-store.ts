import { useEffect, useReducer } from 'react';

import {
  type JourneyRun,
  createJourneyRun,
  parseJourneyRun,
  reduceJourneyRun,
} from './journey-state';

const storagePrefix = 'approval-flows:run:';

interface JourneyRunKey {
  runId: string;
  journeyId: string;
  variantId: string;
  wallet: JourneyRun['wallet'];
}

function getStorage() {
  if (typeof window === 'undefined') return null;
  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
}

function readStoredValue(runId: string): unknown {
  const raw = getStorage()?.getItem(`${storagePrefix}${runId}`);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function loadJourneyRun(key: JourneyRunKey): JourneyRun {
  const stored = parseJourneyRun(readStoredValue(key.runId));
  if (
    stored &&
    stored.journeyId === key.journeyId &&
    stored.variantId === key.variantId &&
    stored.wallet === key.wallet
  ) {
    return stored;
  }
  return createJourneyRun(key);
}

function saveJourneyRun(run: JourneyRun) {
  try {
    getStorage()?.setItem(`${storagePrefix}${run.runId}`, JSON.stringify(run));
  } catch {
    return;
  }
}

export function useJourneyRun(key: JourneyRunKey) {
  const [run, dispatch] = useReducer(reduceJourneyRun, key, loadJourneyRun);

  useEffect(() => {
    saveJourneyRun(run);
  }, [run]);

  return [run, dispatch] as const;
}

export function exportJourneySession(run: JourneyRun) {
  const session = { exportedAt: new Date().toISOString(), run };
  const blob = new Blob([JSON.stringify(session, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `approval-flows-${run.journeyId}-${run.runId}.json`;
  anchor.click();
  URL.revokeObjectURL(url);
}
