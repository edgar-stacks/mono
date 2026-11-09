import { describe, expect, test } from 'vitest';

import { resolveJourney } from './journey-definitions';
import {
  type JourneyAction,
  type JourneyRun,
  createJourneyRun,
  isJourneyRun,
  journeyRequestKey,
  parseJourneyRun,
  pendingTransaction,
  reduceJourneyRun,
} from './journey-state';

function startRun(
  familyId: string,
  variantId?: string,
  wallet: 'software' | 'ledger' = 'software'
) {
  const run = createJourneyRun('run-1', resolveJourney({ familyId, variantId, wallet }));
  return reduceJourneyRun(run, { type: 'open', runId: run.runId });
}

function act(
  run: JourneyRun,
  type: Exclude<JourneyAction['type'], 'open' | 'set-outcome' | 'settle'>
) {
  const key = journeyRequestKey(run);
  if (!key) throw new Error('Run has no open request');
  return reduceJourneyRun(run, { type, ...key });
}

function settle(run: JourneyRun) {
  const key = journeyRequestKey(run);
  const transaction = pendingTransaction(run);
  if (!key || !transaction) throw new Error('Run has no pending transaction');
  return reduceJourneyRun(run, { type: 'settle', transactionId: transaction.id, ...key });
}

describe('reduceJourneyRun', () => {
  test('opening a request moves from the app to review with a new request id', () => {
    const run = startRun('leather-send-swap', 'btc');
    expect(run.phase).toBe('review');
    expect(run.revision).toBe(1);
    expect(run.requestId).toBe('run-1:1');
  });

  test('a software transaction submits as pending before confirmation', () => {
    const approved = act(startRun('leather-send-swap', 'btc'), 'approve');
    expect(approved.phase).toBe('pending');
    expect(approved.transactions).toHaveLength(1);
    expect(approved.transactions[0]).toMatchObject({ status: 'pending', feeCharged: false });

    const confirmed = settle(approved);
    expect(confirmed.phase).toBe('confirmed');
    expect(confirmed.transactions[0]).toMatchObject({ status: 'confirmed', feeCharged: true });
  });

  test('a Ledger transaction does not move forward before device approval', () => {
    const approved = act(startRun('leather-send-swap', 'stx', 'ledger'), 'approve');
    expect(approved.phase).toBe('device');
    expect(approved.transactions).toHaveLength(0);

    const deviceApproved = act(approved, 'device-approve');
    expect(deviceApproved.phase).toBe('pending');
    expect(deviceApproved.transactions).toHaveLength(1);
  });

  test('a device rejection returns to review without a transaction', () => {
    const rejected = act(
      act(startRun('leather-send-swap', 'stx', 'ledger'), 'approve'),
      'device-reject'
    );
    expect(rejected.phase).toBe('review');
    expect(rejected.deviceRejected).toBe(true);
    expect(rejected.transactions).toHaveLength(0);
  });

  test('an already-signed Ledger transaction broadcasts without asking the device again', () => {
    const approved = act(startRun('vault-broadcast', 'bitcoin', 'ledger'), 'approve');
    expect(approved.phase).toBe('pending');
  });

  test('a signed Ledger transaction retries a pre-broadcast failure without the device', () => {
    const opened = startRun('leather-send-swap', 'btc', 'ledger');
    const failing = reduceJourneyRun(opened, {
      type: 'set-outcome',
      runId: opened.runId,
      outcome: 'pre-broadcast-failure',
    });
    const failed = act(act(failing, 'approve'), 'device-approve');
    expect(failed.phase).toBe('failed');
    expect(failed.failure).toBe('pre-broadcast');
    expect(failed.transactions).toHaveLength(0);

    const retried = act(failed, 'retry');
    expect(retried.phase).toBe('pending');
    expect(retried.transactions).toHaveLength(1);
  });

  test('sharing a known Ledger account needs no device signature', () => {
    const connected = act(startRun('connect', 'first', 'ledger'), 'approve');
    expect(connected.phase).toBe('connected');
    expect(connected.transactions).toHaveLength(0);
  });

  test('sign-only requests create no transaction', () => {
    const signedMessage = act(startRun('message-signing', 'plain'), 'approve');
    expect(signedMessage.phase).toBe('signed');
    expect(signedMessage.transactions).toHaveLength(0);

    const signedPsbt = act(startRun('psbt-signing', 'sign-only'), 'approve');
    expect(signedPsbt.phase).toBe('signed');
    expect(signedPsbt.transactions).toHaveLength(0);
  });

  test('a failed submitted call keeps its fee and cannot continue as success', () => {
    const opened = startRun('generic-mint');
    const failing = reduceJourneyRun(opened, {
      type: 'set-outcome',
      runId: opened.runId,
      outcome: 'on-chain-failure',
    });
    const failed = settle(act(failing, 'approve'));
    expect(failed.phase).toBe('failed');
    expect(failed.failure).toBe('on-chain');
    expect(failed.transactions[0]).toMatchObject({ status: 'failed', feeCharged: true });

    expect(act(failed, 'retry')).toBe(failed);
    expect(act(failed, 'approve')).toBe(failed);
    expect(
      reduceJourneyRun(failed, { type: 'set-outcome', runId: failed.runId, outcome: 'success' })
    ).toBe(failed);
  });

  test('a pre-broadcast failure charges no fee', () => {
    const opened = startRun('leather-send-swap', 'btc');
    const failed = act(
      reduceJourneyRun(opened, {
        type: 'set-outcome',
        runId: opened.runId,
        outcome: 'pre-broadcast-failure',
      }),
      'approve'
    );
    expect(failed.failure).toBe('pre-broadcast');
    expect(failed.transactions).toEqual([]);
  });

  test('stale or replayed callbacks cannot advance or duplicate a journey', () => {
    const opened = startRun('leather-send-swap', 'btc');
    const staleKey = journeyRequestKey(opened);
    if (!staleKey) throw new Error('Run has no open request');

    const amended = act(opened, 'amend');
    expect(amended.requestId).toBe('run-1:2');
    expect(reduceJourneyRun(amended, { type: 'approve', ...staleKey })).toBe(amended);

    const otherRun = reduceJourneyRun(amended, {
      type: 'approve',
      ...staleKey,
      runId: 'run-0',
      revision: amended.revision,
      requestId: amended.requestId ?? '',
    });
    expect(otherRun).toBe(amended);

    const pending = act(amended, 'approve');
    expect(act(pending, 'approve')).toBe(pending);
    const confirmed = settle(pending);
    const transactionId = confirmed.transactions[0].id;
    const key = journeyRequestKey(confirmed);
    if (!key) throw new Error('Run has no open request');
    expect(reduceJourneyRun(confirmed, { type: 'settle', transactionId, ...key })).toBe(confirmed);
    expect(confirmed.transactions).toHaveLength(1);
  });

  test('cancel returns to the app as rejected and the app can ask again', () => {
    const cancelled = act(startRun('connect'), 'cancel');
    expect(cancelled.phase).toBe('rejected');
    const reopened = reduceJourneyRun(cancelled, { type: 'open', runId: cancelled.runId });
    expect(reopened.phase).toBe('review');
    expect(reopened.revision).toBe(2);
  });
});

describe('isJourneyRun', () => {
  test('accepts a persisted run and rejects malformed state', () => {
    const run = startRun('leather-send-swap', 'btc');
    const persisted: unknown = JSON.parse(JSON.stringify(run));
    expect(isJourneyRun(persisted)).toBe(true);
    expect(parseJourneyRun(persisted)).toEqual(run);
    expect(isJourneyRun({ ...run, phase: 'teleported' })).toBe(false);
    expect(isJourneyRun({ ...run, runId: '' })).toBe(false);
    expect(isJourneyRun(null)).toBe(false);
  });
});
