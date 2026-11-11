import { renderToStaticMarkup } from 'react-dom/server';

import { describe, expect, it, vi } from 'vitest';

import { findDirection } from '../directions/direction-registry';
import type { SignerKind } from '../scenarios/approval-model';
import { JourneyActivity, activityIconFor } from './journey-activity';
import {
  type JourneyAction,
  type JourneyRun,
  createJourneyRun,
  journeyRequest,
  reduceJourneyRun,
} from './journey-state';
import { JourneyWalletView, describeJourneyResult, deviceLinesFor } from './journey-wallet-views';

vi.mock('lottie-react', () => ({
  default: function LottieMock() {
    return null;
  },
}));

const runId = 'run-1';
const direction = findDirection('handshake');

type StepType = Exclude<JourneyAction['type'], 'request' | 'set-outcome' | 'approve'>;

function startRun(journeyId: string, variantId: string, wallet: SignerKind = 'software') {
  return reduceJourneyRun(createJourneyRun({ runId, journeyId, variantId, wallet }), {
    type: 'request',
    runId,
  });
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

function step(run: JourneyRun, ...types: StepType[]) {
  return types.reduce((current, type) => {
    if (!current.request) throw new Error('No open request');
    return reduceJourneyRun(current, { type, runId, requestId: current.request.id });
  }, run);
}

function occurrences(html: string, text: string) {
  return html.split(text).length - 1;
}

function renderWallet(run: JourneyRun) {
  return renderToStaticMarkup(
    <JourneyWalletView
      run={run}
      request={journeyRequest(run)}
      direction={direction}
      dispatch={vi.fn()}
    />
  );
}

function result(run: JourneyRun) {
  return describeJourneyResult(run, journeyRequest(run));
}

describe('JourneyWalletView', () => {
  it('renders nothing before the app asks', () => {
    const run = createJourneyRun({
      runId,
      journeyId: 'connect',
      variantId: 'first-visit',
      wallet: 'software',
    });
    expect(renderWallet(run)).toBe('');
  });

  it('reviews a connect request with what is shared', () => {
    const html = renderWallet(startRun('connect', 'first-visit'));
    expect(html).toContain('Connect to Bitflow');
    expect(html).toContain('Bitcoin address');
    expect(html).toContain('First visit');
    expect(html).toContain('>Connect<');
  });

  it('labels a sign-only request as signing, not approving a broadcast', () => {
    const html = renderWallet(startRun('psbt-signing', 'sign-only'));
    expect(html).toContain('>Sign<');
    expect(html).toContain('decides when to broadcast');
  });

  it('sends a Ledger review on to the device', () => {
    expect(renderWallet(startRun('leather-send', 'btc', 'ledger'))).toContain('Continue on Ledger');
  });

  it('shows the Ledger device sheet over the review', () => {
    const html = renderWallet(approve(startRun('leather-send', 'btc', 'ledger')));
    expect(html).toContain('Connect your Ledger');
    expect(html).toContain('Send BTC');
  });

  it('identifies the vault funds separately from the personal signer', () => {
    const html = renderWallet(startRun('vault', 'stacks-co-sign', 'ledger'));
    expect(html).toContain('Funds from vault');
    expect(html).toContain('Team Treasury');
    expect(html).toContain('Your signature from');
    expect(html).toContain('Ledger account');
  });

  it('shows no invented movements for a call without limits', () => {
    const html = renderWallet(startRun('contract-unlimited', 'default'));
    expect(html).toContain('No spending limits');
    expect(html).toContain('Not limited');
    expect(html).not.toContain('You send');
  });

  it('keeps signing and broadcasting distinct', () => {
    const signing = approve(startRun('leather-send', 'stx'));
    expect(renderWallet(signing)).toContain('Signing');
    expect(renderWallet(step(signing, 'signed'))).toContain('Broadcasting');
  });
});

describe(describeJourneyResult.name, () => {
  it('waits while the wallet is open', () => {
    expect(result(startRun('leather-send', 'stx'))?.title).toBe('Waiting for Leather');
  });

  it('reports a submitted transaction as pending, not confirmed', () => {
    const pending = step(approve(startRun('leather-send', 'stx')), 'signed', 'broadcast-accepted');
    expect(result(pending)).toMatchObject({ title: 'Transaction submitted', tone: 'progress' });
    expect(result(step(pending, 'confirm'))).toMatchObject({ title: 'Confirmed', tone: 'success' });
  });

  it('tells the user the fee was charged when a call fails on chain', () => {
    const failed = step(
      approve(startRun('contract-mint', 'default')),
      'signed',
      'broadcast-accepted',
      'fail'
    );
    expect(result(failed)?.title).toBe('Failed on chain');
    expect(result(failed)?.body).toContain('0.0045 STX was charged');
  });

  it('tells the user no fee was charged when broadcast fails', () => {
    const failed = step(approve(startRun('leather-send', 'btc')), 'signed', 'broadcast-rejected');
    expect(result(failed)?.title).toBe('Couldn’t broadcast');
    expect(result(failed)?.body).toContain('no fee was charged');
  });

  it('returns sign-only transactions to the app without Activity', () => {
    const signed = step(approve(startRun('app-stacks-transaction', 'sign-only')), 'signed');
    expect(result(signed)?.title).toBe('Signed transaction received');
    expect(result(signed)?.body).toContain('records nothing in Activity');
  });

  it('counts the vault signature toward the threshold', () => {
    const signed = step(approve(startRun('vault', 'bitcoin-co-sign')), 'signed');
    expect(result(signed)?.body).toContain('3 of 3 signatures');
  });

  it('distinguishes a rejection on the device from a cancel', () => {
    const rejected = step(approve(startRun('leather-send', 'btc', 'ledger')), 'device-reject');
    expect(result(rejected)?.title).toBe('Rejected on Ledger');
    expect(result(step(startRun('leather-send', 'btc'), 'cancel'))?.title).toBe(
      'Request cancelled'
    );
  });
});

describe(deviceLinesFor.name, () => {
  it('mirrors the amount and fee on the device', () => {
    const run = startRun('leather-send', 'btc', 'ledger');
    expect(deviceLinesFor(journeyRequest(run))).toEqual([
      'Review transaction',
      'Send 0.0125 BTC',
      'Fee 0.0000282 BTC',
    ]);
  });
});

describe('JourneyActivity', () => {
  it('lists a pending transaction without a balance summary', () => {
    const pending = step(
      approve(startRun('bitflow-swap', 'default')),
      'signed',
      'broadcast-accepted'
    );
    const html = renderToStaticMarkup(
      <JourneyActivity run={pending} request={journeyRequest(pending)} />
    );
    expect(html).toContain('swap-helper-a');
    expect(html).toContain('Pending');
    expect(occurrences(html, '+0.00961 sBTC')).toBe(1);
  });

  it('summarizes the net change once confirmed', () => {
    const confirmed = step(
      approve(startRun('bitflow-swap', 'default')),
      'signed',
      'broadcast-accepted',
      'confirm'
    );
    const html = renderToStaticMarkup(
      <JourneyActivity run={confirmed} request={journeyRequest(confirmed)} />
    );
    expect(occurrences(html, '+0.00961 sBTC')).toBe(2);
    expect(html).toContain('−1,500.0045 STX');
  });

  it('keeps sign-only requests out of Activity', () => {
    const signed = step(approve(startRun('psbt-signing', 'sign-only')), 'signed');
    const html = renderToStaticMarkup(
      <JourneyActivity run={signed} request={journeyRequest(signed)} />
    );
    expect(html).toContain('Nothing from this session yet');
  });

  it('draws contract calls with the function icon', () => {
    const run = startRun('contract-vote', 'default');
    expect(activityIconFor(journeyRequest(run))).toBe('function');
    expect(activityIconFor(journeyRequest(startRun('leather-send', 'stx')))).toBe('send');
  });
});
