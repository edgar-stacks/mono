import { useEffect, useReducer } from 'react';

import type { SignerKind } from '../scenarios/approval-model';
import {
  type JourneyRun,
  createJourneyRun,
  parseJourneyRun,
  reduceJourneyRun,
} from './journey-state';

const storagePrefix = 'leather.playground.approval-flows.run.';

function storageKey(runId: string) {
  return `${storagePrefix}${runId}`;
}

function loadJourneyRun(runId: string): JourneyRun | null {
  try {
    const stored = window.localStorage.getItem(storageKey(runId));
    if (!stored) return null;
    const parsed: unknown = JSON.parse(stored);
    return parseJourneyRun(parsed);
  } catch {
    return null;
  }
}

function saveJourneyRun(run: JourneyRun) {
  try {
    window.localStorage.setItem(storageKey(run.runId), JSON.stringify(run));
  } catch {
    return;
  }
}

interface UseJourneyRunInput {
  runId: string;
  journeyId: string;
  variantId: string;
  wallet: SignerKind;
}

function initialRun(input: UseJourneyRunInput) {
  const stored = loadJourneyRun(input.runId);
  const matches =
    stored?.journeyId === input.journeyId &&
    stored.variantId === input.variantId &&
    stored.wallet === input.wallet;
  return stored && matches ? stored : createJourneyRun(input);
}

export function useJourneyRun(input: UseJourneyRunInput) {
  const [run, dispatch] = useReducer(reduceJourneyRun, input, initialRun);

  useEffect(() => saveJourneyRun(run), [run]);

  return { run, dispatch };
}
