import { type ReactElement, act, createRef } from 'react';
import { type Root, createRoot } from 'react-dom/client';

import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

import { JourneyActivity } from './journey-activity';
import { JourneyAppSurface } from './journey-app-surface';
import { resolveJourney } from './journey-definitions';
import { type JourneyRun, type JourneyStage, createJourneyRun } from './journey-state';
import { deriveJourneyWorld } from './journey-world';

const mounted: { root: Root; container: HTMLElement }[] = [];

function mount(element: ReactElement) {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);
  act(() => root.render(element));
  mounted.push({ root, container });
  return container;
}

function runAt(stage: JourneyStage): JourneyRun {
  return {
    ...createJourneyRun({
      runId: 'run-1',
      journeyId: 'leather-send',
      variantId: 'btc',
      wallet: 'software',
    }),
    requestId: 1,
    nextRequestId: 2,
    stage,
    isPayloadSigned: stage !== 'reviewing',
  };
}

function renderSurface(stage: JourneyStage) {
  const { definition, variant } = resolveJourney('leather-send', 'btc');
  return mount(
    <JourneyAppSurface
      definition={definition}
      request={variant.request}
      run={runAt(stage)}
      triggerRef={createRef()}
      onStart={vi.fn()}
      onShowActivity={vi.fn()}
    />
  );
}

function renderActivity(stage: JourneyStage) {
  const { variant } = resolveJourney('leather-send', 'btc');
  return mount(
    <JourneyActivity
      world={deriveJourneyWorld('software', [])}
      stage={stage}
      pending={{ title: variant.request.activityTitle, accountId: variant.request.accountId }}
    />
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

describe('JourneyAppSurface', () => {
  it('does not report a broadcasting transaction as submitted', () => {
    const response = renderSurface('broadcasting').querySelector('[data-app-response]');
    expect(response?.textContent).not.toContain('submitted');
    expect(response?.textContent).toContain('Waiting for the network to accept');
  });

  it('reports a pending transaction as submitted', () => {
    const response = renderSurface('pending').querySelector('[data-app-response]');
    expect(response?.textContent).toContain('Transaction submitted');
  });
});

describe('JourneyActivity', () => {
  it('shows no pending row while the transaction is still broadcasting', () => {
    const container = renderActivity('broadcasting');
    expect(container.querySelector('[data-activity="pending"]')).toBeNull();
  });

  it('shows a pending row once the network accepted the transaction', () => {
    const container = renderActivity('pending');
    expect(container.querySelector('[data-activity="pending"]')?.textContent).toContain('Pending');
  });
});
