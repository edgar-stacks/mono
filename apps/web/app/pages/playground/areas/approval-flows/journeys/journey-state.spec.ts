import { describe, expect, it } from 'vitest';

import {
  type JourneyEvent,
  type JourneyRun,
  createJourneyRun,
  isJourneyRun,
  reduceJourneyRun,
} from './journey-state';

type RequestEventType = Exclude<JourneyEvent['type'], 'open-request'>;

function startRun(journeyId: string, variantId: string, wallet: JourneyRun['wallet'] = 'software') {
  return createJourneyRun({ runId: 'run-a', journeyId, variantId, wallet });
}

function open(run: JourneyRun) {
  return reduceJourneyRun(run, { type: 'open-request', runId: run.runId, revision: run.revision });
}

function send(run: JourneyRun, type: RequestEventType) {
  return reduceJourneyRun(run, {
    type,
    runId: run.runId,
    revision: run.revision,
    requestId: run.requestId ?? 0,
  });
}

function sequence(run: JourneyRun, types: RequestEventType[]) {
  return types.reduce(send, run);
}

describe('reduceJourneyRun', () => {
  it('opens a request with a fresh request id', () => {
    const run = open(startRun('leather-send', 'btc'));
    expect(run.stage).toBe('reviewing');
    expect(run.requestId).toBe(1);
    expect(run.revision).toBe(1);
  });

  it('submits a software transaction before it confirms', () => {
    const approved = send(open(startRun('leather-send', 'btc')), 'approve');
    expect(approved.stage).toBe('broadcasting');
    const submitted = send(approved, 'submitted');
    expect(submitted.stage).toBe('pending');
    expect(submitted.outcomes).toHaveLength(0);
    const confirmed = send(submitted, 'confirm');
    expect(confirmed.stage).toBe('confirmed');
    expect(confirmed.outcomes).toEqual([
      expect.objectContaining({ status: 'confirmed', requestId: 1, title: 'Sent Bitcoin' }),
    ]);
  });

  it('ignores a stale callback from an earlier revision', () => {
    const reviewing = open(startRun('leather-send', 'btc'));
    const approved = send(reviewing, 'approve');
    const replayed = reduceJourneyRun(approved, {
      type: 'approve',
      runId: reviewing.runId,
      revision: reviewing.revision,
      requestId: 1,
    });
    expect(replayed).toBe(approved);
  });

  it('ignores callbacks addressed to another run or request', () => {
    const reviewing = open(startRun('leather-send', 'btc'));
    const otherRun = reduceJourneyRun(reviewing, {
      type: 'approve',
      runId: 'run-b',
      revision: reviewing.revision,
      requestId: 1,
    });
    const otherRequest = reduceJourneyRun(reviewing, {
      type: 'approve',
      runId: reviewing.runId,
      revision: reviewing.revision,
      requestId: 2,
    });
    expect(otherRun).toBe(reviewing);
    expect(otherRequest).toBe(reviewing);
  });

  it('does not duplicate an outcome when a confirmation is replayed', () => {
    const pending = sequence(open(startRun('leather-send', 'stx')), ['approve', 'submitted']);
    const confirmed = send(pending, 'confirm');
    const replayed = reduceJourneyRun(confirmed, {
      type: 'confirm',
      runId: pending.runId,
      revision: pending.revision,
      requestId: 1,
    });
    expect(replayed.outcomes).toHaveLength(1);
  });

  it('creates no transaction for a sign-only request', () => {
    const signed = send(open(startRun('app-stacks-transaction', 'sign-only')), 'approve');
    expect(signed.stage).toBe('signed');
    expect(send(signed, 'submitted')).toBe(signed);
    expect(signed.outcomes).toHaveLength(0);
  });

  it('keeps the fee of a failed submitted call and cannot continue as success', () => {
    const pending = sequence(open(startRun('bitflow-swap', 'stx-sbtc')), ['approve', 'submitted']);
    const failed = send(pending, 'fail');
    expect(failed.stage).toBe('failed');
    expect(failed.failure).toBe('submitted');
    expect(failed.outcomes).toEqual([
      expect.objectContaining({
        status: 'failed',
        movements: [],
        fee: { asset: 'stx', amount: 12_000 },
      }),
    ]);
    expect(send(failed, 'confirm')).toBe(failed);
    expect(send(failed, 'retry')).toBe(failed);
  });

  it('charges no fee when the broadcast fails before it is submitted', () => {
    const failed = sequence(open(startRun('leather-send', 'btc')), ['approve', 'fail']);
    expect(failed.failure).toBe('pre-broadcast');
    expect(failed.outcomes).toHaveLength(0);
  });

  it('holds a Ledger transaction until the device approves', () => {
    const awaiting = send(open(startRun('leather-send', 'btc', 'ledger')), 'approve');
    expect(awaiting.stage).toBe('awaiting-device');
    expect(send(awaiting, 'submitted')).toBe(awaiting);
    expect(send(awaiting, 'confirm')).toBe(awaiting);
    const broadcasting = send(awaiting, 'device-approve');
    expect(broadcasting.stage).toBe('broadcasting');
  });

  it('broadcasts an already-signed Ledger transaction again without the device', () => {
    const failed = sequence(open(startRun('leather-send', 'btc', 'ledger')), [
      'approve',
      'device-approve',
      'fail',
    ]);
    const retried = send(failed, 'retry');
    expect(retried.stage).toBe('broadcasting');
  });

  it('shares a known Ledger account without a device signature', () => {
    const connected = send(open(startRun('connect', 'first', 'ledger')), 'approve');
    expect(connected.stage).toBe('connected');
  });

  it('returns to review when the device rejects', () => {
    const rejected = sequence(open(startRun('sign-message', 'utf8', 'ledger')), [
      'approve',
      'device-reject',
    ]);
    expect(rejected.stage).toBe('reviewing');
  });

  it('cancels only an open request', () => {
    const cancelled = send(open(startRun('connect', 'first')), 'cancel');
    expect(cancelled.stage).toBe('cancelled');
    expect(send(cancelled, 'cancel')).toBe(cancelled);
  });

  it('does not open a second request while one is open', () => {
    const reviewing = open(startRun('connect', 'first'));
    expect(open(reviewing)).toBe(reviewing);
  });
});

describe('isJourneyRun', () => {
  it('accepts a run produced by the reducer', () => {
    const run = sequence(open(startRun('leather-send', 'btc')), [
      'approve',
      'submitted',
      'confirm',
    ]);
    expect(isJourneyRun(JSON.parse(JSON.stringify(run)))).toBe(true);
  });

  it('rejects malformed persisted state', () => {
    expect(isJourneyRun(null)).toBe(false);
    expect(isJourneyRun({ runId: 'run-a' })).toBe(false);
    expect(isJourneyRun({ ...startRun('connect', 'first'), stage: 'teleported' })).toBe(false);
    expect(isJourneyRun({ ...startRun('connect', 'first'), wallet: 'paper' })).toBe(false);
  });
});
