import { describe, expect, it } from 'vitest';

import { toBaseUnits } from '../scenarios/approval-assets';
import type { SignerKind } from '../scenarios/approval-model';
import {
  type JourneyAction,
  type JourneyRun,
  createJourneyRun,
  isJourneyRun,
  reduceJourneyRun,
} from './journey-state';

const runId = 'run-1';

function startRun(journeyId: string, variantId: string, wallet: SignerKind = 'software') {
  const run = createJourneyRun({ runId, journeyId, variantId, wallet });
  return reduceJourneyRun(run, { type: 'request', runId });
}

function requestId(run: JourneyRun) {
  if (!run.request) throw new Error('No open request');
  return run.request.id;
}

function step(
  run: JourneyRun,
  type: Exclude<JourneyAction['type'], 'request' | 'set-outcome' | 'approve'>
) {
  return reduceJourneyRun(run, { type, runId, requestId: requestId(run) });
}

function approve(run: JourneyRun) {
  if (!run.request) throw new Error('No open request');
  return reduceJourneyRun(run, {
    type: 'approve',
    runId,
    requestId: run.request.id,
    revision: run.request.revision,
  });
}

describe('reduceJourneyRun', () => {
  it('opens a request for review', () => {
    const run = startRun('leather-send', 'stx');
    expect(run.stage).toBe('review');
    expect(run.request).toEqual({ id: 'run-1:1', revision: 1 });
  });

  it('ignores actions for another run', () => {
    const run = startRun('leather-send', 'stx');
    const next = reduceJourneyRun(run, {
      type: 'approve',
      runId: 'other-run',
      requestId: requestId(run),
      revision: 1,
    });
    expect(next).toBe(run);
  });

  it('ignores callbacks for a stale request', () => {
    const first = step(startRun('leather-send', 'stx'), 'cancel');
    const staleId = requestId(first);
    const second = reduceJourneyRun(first, { type: 'request', runId });
    const next = reduceJourneyRun(second, {
      type: 'approve',
      runId,
      requestId: staleId,
      revision: 1,
    });
    expect(next).toBe(second);
  });

  it('ignores an approval for an earlier revision of the request', () => {
    const run = step(startRun('leather-swap', 'default'), 'revise');
    const next = reduceJourneyRun(run, {
      type: 'approve',
      runId,
      requestId: requestId(run),
      revision: 1,
    });
    expect(next).toBe(run);
    expect(approve(run).stage).toBe('signing');
  });

  it('submits a software transaction before it confirms', () => {
    const signing = approve(startRun('leather-send', 'stx'));
    expect(signing.stage).toBe('signing');
    const broadcasting = step(signing, 'signed');
    expect(broadcasting.stage).toBe('broadcasting');
    const pending = step(broadcasting, 'broadcast-accepted');
    expect(pending.stage).toBe('pending');
    expect(pending.transactions).toHaveLength(1);
    expect(pending.transactions[0].status).toBe('pending');
  });

  it('does not duplicate a transaction on a replayed broadcast callback', () => {
    const pending = step(
      step(approve(startRun('leather-send', 'stx')), 'signed'),
      'broadcast-accepted'
    );
    const replayed = step(pending, 'broadcast-accepted');
    expect(replayed).toBe(pending);
    expect(replayed.transactions).toHaveLength(1);
  });

  it('changes the portfolio only once a transaction confirms', () => {
    const start = startRun('leather-send', 'stx');
    const pending = step(step(approve(start), 'signed'), 'broadcast-accepted');
    expect(pending.portfolios).toEqual(start.portfolios);

    const confirmed = step(pending, 'confirm');
    const startingStx = start.portfolios.account.STX ?? 0;
    expect(confirmed.portfolios.account.STX).toBe(
      startingStx - toBaseUnits('STX', 420) - toBaseUnits('STX', 0.0045)
    );
    expect(step(confirmed, 'confirm')).toBe(confirmed);
  });

  it('keeps the fee of a failed submitted call and cannot continue as success', () => {
    const start = startRun('contract-mint', 'default');
    const pending = step(step(approve(start), 'signed'), 'broadcast-accepted');
    const failed = step(pending, 'fail');
    expect(failed.stage).toBe('failed');
    expect(failed.failure).toEqual({ phase: 'on-chain', feeCharged: true });
    expect(failed.transactions[0]).toMatchObject({ status: 'failed', feeCharged: true });
    expect(failed.portfolios.account.STX).toBe(
      (start.portfolios.account.STX ?? 0) - toBaseUnits('STX', 0.0045)
    );
    expect(step(failed, 'confirm')).toBe(failed);
  });

  it('charges no fee for a failure before broadcast', () => {
    const start = startRun('leather-send', 'btc');
    const failed = step(step(approve(start), 'signed'), 'broadcast-rejected');
    expect(failed.stage).toBe('failed');
    expect(failed.failure).toEqual({ phase: 'pre-broadcast', feeCharged: false });
    expect(failed.transactions).toHaveLength(0);
    expect(failed.portfolios).toEqual(start.portfolios);
  });

  it('creates no transaction for a sign-only request', () => {
    const start = startRun('psbt-signing', 'sign-only');
    const signed = step(approve(start), 'signed');
    expect(signed.stage).toBe('signed');
    expect(signed.transactions).toHaveLength(0);
    expect(signed.portfolios).toEqual(start.portfolios);
  });

  it('creates no transaction for a signed message', () => {
    const signed = step(approve(startRun('message-signing', 'structured')), 'signed');
    expect(signed.stage).toBe('signed');
    expect(signed.transactions).toHaveLength(0);
  });

  it('holds a Ledger transaction until the device approves', () => {
    const device = approve(startRun('leather-send', 'btc', 'ledger'));
    expect(device.stage).toBe('device');
    expect(step(device, 'signed')).toBe(device);
    expect(step(device, 'broadcast-accepted')).toBe(device);
    expect(step(device, 'device-approve').stage).toBe('signing');
  });

  it('cancels when the Ledger device rejects', () => {
    const rejected = step(approve(startRun('leather-send', 'btc', 'ledger')), 'device-reject');
    expect(rejected.stage).toBe('cancelled');
    expect(rejected.cancelledOnDevice).toBe(true);
  });

  it('broadcasts an already-signed Ledger transaction without asking the device again', () => {
    const run = approve(startRun('vault', 'bitcoin-broadcast', 'ledger'));
    expect(run.stage).toBe('broadcasting');
  });

  it('shares a known Ledger account without a device signature', () => {
    const run = approve(startRun('connect', 'first-visit', 'ledger'));
    expect(run.stage).toBe('connected');
  });

  it('settles vault payments against the vault, not the personal signer', () => {
    const start = startRun('vault', 'stacks-broadcast');
    const confirmed = step(step(approve(start), 'broadcast-accepted'), 'confirm');
    expect(confirmed.portfolios.account).toEqual(start.portfolios.account);
    const startingVaultStx = start.portfolios.vault.STX;
    if (startingVaultStx === undefined) throw new Error('Vault holds no STX');
    expect(confirmed.portfolios.vault.STX).toBeLessThan(startingVaultStx);
  });

  it('records the next outcome without touching the stage', () => {
    const run = startRun('leather-send', 'stx');
    const next = reduceJourneyRun(run, { type: 'set-outcome', runId, outcome: 'chain-failure' });
    expect(next.outcome).toBe('chain-failure');
    expect(next.stage).toBe('review');
  });
});

describe('isJourneyRun', () => {
  it('accepts a run that went through the reducer', () => {
    const run = step(approve(startRun('leather-send', 'stx')), 'signed');
    expect(isJourneyRun(JSON.parse(JSON.stringify(run)))).toBe(true);
  });

  it('rejects malformed persisted state', () => {
    expect(isJourneyRun(null)).toBe(false);
    expect(isJourneyRun({ runId: 'run-1', stage: 'review' })).toBe(false);
    expect(
      isJourneyRun({
        ...createJourneyRun({
          runId,
          journeyId: 'connect',
          variantId: 'returning',
          wallet: 'software',
        }),
        stage: 'teleported',
      })
    ).toBe(false);
  });
});
