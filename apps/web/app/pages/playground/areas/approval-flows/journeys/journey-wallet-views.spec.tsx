import { renderToStaticMarkup } from 'react-dom/server';

import { describe, expect, test, vi } from 'vitest';

import { resolveDirection } from '../directions/direction-registry';
import { type ResolvedJourney, resolveJourney } from './journey-definitions';
import {
  type JourneyRun,
  createJourneyRun,
  journeyRequestKey,
  reduceJourneyRun,
} from './journey-state';
import { JourneyWalletView } from './journey-wallet-views';

vi.mock('lottie-react', () => ({
  default() {
    return null;
  },
}));

const direction = resolveDirection('handshake');

function openRun(journey: ResolvedJourney) {
  const run = createJourneyRun('run-1', journey);
  return reduceJourneyRun(run, { type: 'open', runId: run.runId });
}

function step(run: JourneyRun, type: 'approve' | 'device-approve' | 'device-reject') {
  const key = journeyRequestKey(run);
  if (!key) throw new Error('Run has no open request');
  return reduceJourneyRun(run, { type, ...key });
}

function render(run: JourneyRun, journey: ResolvedJourney) {
  return renderToStaticMarkup(
    <JourneyWalletView
      run={run}
      request={journey.request}
      appName={journey.family.app.name}
      direction={direction}
      animateHeader={false}
      onAction={vi.fn()}
      onClose={vi.fn()}
    />
  );
}

describe('JourneyWalletView', () => {
  test('reviews the request with cancel and approve', () => {
    const journey = resolveJourney({ familyId: 'leather-send-swap', variantId: 'btc' });
    const html = render(openRun(journey), journey);
    expect(html).toContain('Send 0.0125 BTC');
    expect(html).toContain('Cancel');
    expect(html).toContain('>Send<');
    expect(html).toContain('Network fee');
  });

  test('identifies the vault funds and the personal signer', () => {
    const journey = resolveJourney({
      familyId: 'vault-cosign',
      variantId: 'bitcoin',
      wallet: 'ledger',
    });
    const html = render(openRun(journey), journey);
    expect(html).toContain('Funds from');
    expect(html).toContain('Bitcoin treasury vault');
    expect(html).toContain('Signing with');
    expect(html).toContain('Ledger account');
  });

  test('shows the Ledger sheet over the request while the device is needed', () => {
    const journey = resolveJourney({
      familyId: 'leather-send-swap',
      variantId: 'stx',
      wallet: 'ledger',
    });
    const html = render(step(openRun(journey), 'approve'), journey);
    expect(html).toContain('Connect your Ledger');
    expect(html).toContain('Send 250 STX');
  });

  test('explains a device rejection back on the review', () => {
    const journey = resolveJourney({
      familyId: 'leather-send-swap',
      variantId: 'stx',
      wallet: 'ledger',
    });
    const html = render(step(step(openRun(journey), 'approve'), 'device-reject'), journey);
    expect(html).toContain('Rejected on your Ledger');
  });

  test('keeps signing, broadcast and confirmation apart', () => {
    const send = resolveJourney({ familyId: 'leather-send-swap', variantId: 'btc' });
    expect(render(step(openRun(send), 'approve'), send)).toContain('Submitted');

    const message = resolveJourney({ familyId: 'message-signing' });
    const signed = render(step(openRun(message), 'approve'), message);
    expect(signed).toContain('Signed');
    expect(signed).toContain('Nothing was broadcast');

    const connect = resolveJourney({ familyId: 'connect' });
    expect(render(step(openRun(connect), 'approve'), connect)).toContain('Connected');
  });

  test('a pre-broadcast failure charges no fee and can be retried', () => {
    const journey = resolveJourney({ familyId: 'leather-send-swap', variantId: 'btc' });
    const opened = openRun(journey);
    const failing = reduceJourneyRun(opened, {
      type: 'set-outcome',
      runId: opened.runId,
      outcome: 'pre-broadcast-failure',
    });
    const html = render(step(failing, 'approve'), journey);
    expect(html).toContain('Not broadcast');
    expect(html).toContain('No fee was charged');
    expect(html).toContain('Try again');
  });

  test('an on-chain failure keeps the fee and cannot be retried', () => {
    const journey = resolveJourney({ familyId: 'generic-mint' });
    const opened = openRun(journey);
    const pending = step(
      reduceJourneyRun(opened, {
        type: 'set-outcome',
        runId: opened.runId,
        outcome: 'on-chain-failure',
      }),
      'approve'
    );
    const key = journeyRequestKey(pending);
    if (!key) throw new Error('Run has no open request');
    const failed = reduceJourneyRun(pending, {
      type: 'settle',
      transactionId: pending.transactions[0].id,
      ...key,
    });
    const html = render(failed, journey);
    expect(html).toContain('Failed on-chain');
    expect(html).toContain('fee was still charged');
    expect(html).not.toContain('Try again');
  });

  test('a generic call without limits warns and shows no estimated movements', () => {
    const journey = resolveJourney({ familyId: 'generic-router' });
    const html = render(openRun(journey), journey);
    expect(html).toContain('No spending limits');
    expect(html).toContain('No estimated balance change');
  });

  test('renders nothing while the request is back in the app', () => {
    const journey = resolveJourney({ familyId: 'connect' });
    expect(render(createJourneyRun('run-1', journey), journey)).toBe('');
  });
});
