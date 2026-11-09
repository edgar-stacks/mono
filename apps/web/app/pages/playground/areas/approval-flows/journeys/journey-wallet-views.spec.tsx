import { type ReactElement, act } from 'react';
import { type Root, createRoot } from 'react-dom/client';

import { fireEvent } from '@testing-library/react';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

import { getApprovalDirection } from '../directions/direction-registry';
import { resolveJourney } from './journey-definitions';
import type { JourneyFailure, JourneyStage } from './journey-state';
import {
  JourneyWalletView,
  type JourneyWalletViewProps,
  getConfirmLabel,
} from './journey-wallet-views';
import { type JourneyWalletKind, deriveJourneyWorld } from './journey-world';

vi.mock('lottie-react', () => ({
  default: function LottieMock() {
    return <div data-testid="lottie" />;
  },
}));

const mounted: { root: Root; container: HTMLElement }[] = [];

function mount(element: ReactElement) {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);
  act(() => root.render(element));
  mounted.push({ root, container });
  return container;
}

interface RenderViewInput {
  journeyId: string;
  variantId: string;
  stage: JourneyStage;
  failure?: JourneyFailure;
  wallet?: JourneyWalletKind;
  handlers?: Partial<JourneyWalletViewProps>;
}

function renderView({
  journeyId,
  variantId,
  stage,
  failure,
  wallet = 'software',
  handlers,
}: RenderViewInput) {
  const { definition, variant } = resolveJourney(journeyId, variantId);
  return mount(
    <JourneyWalletView
      definition={definition}
      request={variant.request}
      stage={stage}
      failure={failure ?? null}
      world={deriveJourneyWorld(wallet, [])}
      direction={getApprovalDirection('handshake')}
      requestKey="request-1"
      {...handlers}
    />
  );
}

function findButton(container: HTMLElement, label: string) {
  return Array.from(container.querySelectorAll('button')).find(
    button => button.textContent === label
  );
}

beforeAll(() => {
  Reflect.set(globalThis, 'IS_REACT_ACT_ENVIRONMENT', true);
});

afterEach(() => {
  while (mounted.length) {
    const instance = mounted.pop();
    if (!instance) continue;
    act(() => instance.root.unmount());
    instance.container.remove();
  }
});

describe('JourneyWalletView', () => {
  it('renders nothing before a request is opened', () => {
    const container = renderView({ journeyId: 'connect', variantId: 'first', stage: 'idle' });
    expect(container.innerHTML).toBe('');
  });

  it('names the requester, the account and what approving does', () => {
    const container = renderView({
      journeyId: 'leather-send',
      variantId: 'btc',
      stage: 'reviewing',
    });
    expect(container.textContent).toContain('Send Bitcoin');
    expect(container.textContent).toContain('app.leather.io');
    expect(container.textContent).toContain('Account 1');
    expect(container.textContent).toContain('−0.002 BTC');
    expect(container.textContent).toContain('Network fee');
    expect(container.querySelector('[data-effect]')?.textContent).toContain(
      'Leather broadcasts this transaction'
    );
    expect(findButton(container, 'Confirm')).toBeDefined();
  });

  it('cancels from the review', () => {
    const onCancel = vi.fn();
    const container = renderView({
      journeyId: 'connect',
      variantId: 'first',
      stage: 'reviewing',
      handlers: { onCancel },
    });
    const cancel = findButton(container, 'Cancel');
    if (!cancel) throw new Error('Cancel not rendered');
    act(() => {
      fireEvent.click(cancel);
    });
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('shows no invented movements for a generic call without limits', () => {
    const container = renderView({
      journeyId: 'contract-call-unlimited',
      variantId: 'none',
      stage: 'reviewing',
    });
    expect(container.querySelector('[data-notice="no-limits"]')).not.toBeNull();
    expect(container.textContent).not.toContain('Balance changes');
    expect(container.textContent).not.toContain('Estimated');
    expect(container.textContent).toContain('claim-airdrop');
  });

  it('identifies vault funds separately from the personal signer', () => {
    const container = renderView({
      journeyId: 'vault',
      variantId: 'bitcoin-co-sign',
      stage: 'reviewing',
    });
    const identity = container.querySelector('[data-identity="vault"]');
    expect(identity?.textContent).toContain('Funds from');
    expect(identity?.textContent).toContain('Treasury vault');
    expect(identity?.textContent).toContain('Signing as');
    expect(identity?.textContent).toContain('Account 1');
    expect(container.querySelector('[data-signers="1/2"]')).not.toBeNull();
    expect(findButton(container, 'Co-sign')).toBeDefined();
  });

  it('keeps the request visible behind the Ledger device sheet', () => {
    const onDeviceApprove = vi.fn();
    const container = renderView({
      journeyId: 'leather-send',
      variantId: 'btc',
      stage: 'awaiting-device',
      wallet: 'ledger',
      handlers: { onDeviceApprove },
    });
    expect(container.querySelector('[role="dialog"][aria-label="Ledger device"]')).not.toBeNull();
    expect(container.querySelector('[aria-hidden="true"]')?.textContent).toContain('Send Bitcoin');
    const approve = findButton(container, 'Approve on device');
    if (!approve) throw new Error('Device approve not rendered');
    act(() => {
      fireEvent.click(approve);
    });
    expect(onDeviceApprove).toHaveBeenCalledTimes(1);
  });

  it('mentions the Ledger in the effect line', () => {
    const container = renderView({
      journeyId: 'leather-send',
      variantId: 'btc',
      stage: 'reviewing',
      wallet: 'ledger',
    });
    expect(container.querySelector('[data-effect]')?.textContent).toContain(
      'after you approve on your Ledger'
    );
  });

  it('keeps submitted and confirmed apart', () => {
    const pending = renderView({ journeyId: 'leather-send', variantId: 'btc', stage: 'pending' });
    expect(pending.textContent).toContain('Submitted');
    expect(pending.textContent).not.toContain('Confirmed');
    const confirmed = renderView({
      journeyId: 'leather-send',
      variantId: 'btc',
      stage: 'confirmed',
    });
    expect(confirmed.textContent).toContain('Confirmed');
  });

  it('says a sign-only request created no transaction', () => {
    const container = renderView({ journeyId: 'psbt', variantId: 'sign-only', stage: 'signed' });
    expect(container.textContent).toContain('Signed, not broadcast');
    expect(container.textContent).toContain('No transaction exists');
  });

  it('keeps the fee of a call that failed after submission and offers no retry', () => {
    const container = renderView({
      journeyId: 'bitflow-swap',
      variantId: 'stx-sbtc',
      stage: 'failed',
      failure: 'submitted',
    });
    expect(container.querySelector('[data-status="error"]')).not.toBeNull();
    expect(container.textContent).toContain('0.012 STX network fee was charged');
    expect(findButton(container, 'Try again')).toBeUndefined();
  });

  it('charges no fee and offers a retry when the broadcast fails', () => {
    const onRetry = vi.fn();
    const container = renderView({
      journeyId: 'leather-send',
      variantId: 'stx',
      stage: 'failed',
      failure: 'pre-broadcast',
      handlers: { onRetry },
    });
    expect(container.textContent).toContain('no fee was charged');
    const retry = findButton(container, 'Try again');
    if (!retry) throw new Error('Retry not rendered');
    act(() => {
      fireEvent.click(retry);
    });
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('confirms a connection by naming the app', () => {
    const container = renderView({ journeyId: 'connect', variantId: 'first', stage: 'connected' });
    expect(container.textContent).toContain('Connected to Bitflow');
  });

  it('hides actions in a noninteractive preview', () => {
    const container = renderView({
      journeyId: 'leather-send',
      variantId: 'btc',
      stage: 'confirmed',
      handlers: { interactive: false },
    });
    expect(findButton(container, 'Close')).toBeUndefined();
  });
});

describe('getConfirmLabel', () => {
  it('names the action', () => {
    expect(getConfirmLabel(resolveJourney('connect', 'first').variant.request)).toBe('Connect');
    expect(getConfirmLabel(resolveJourney('sign-message', 'utf8').variant.request)).toBe('Sign');
    expect(getConfirmLabel(resolveJourney('psbt', 'sign-only').variant.request)).toBe('Sign');
    expect(getConfirmLabel(resolveJourney('psbt', 'broadcast').variant.request)).toBe('Confirm');
    expect(getConfirmLabel(resolveJourney('vault', 'stacks-propose').variant.request)).toBe(
      'Propose'
    );
    expect(getConfirmLabel(resolveJourney('vault', 'stacks-broadcast').variant.request)).toBe(
      'Broadcast'
    );
  });
});
