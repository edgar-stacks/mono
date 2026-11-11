import { act } from 'react';
import { type Root, createRoot } from 'react-dom/client';

import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

import { ApprovalLedgerAnimation } from './approval-ledger-animation';

vi.mock('lottie-react', () => ({
  default: function LottieMock({ loop }: { loop?: boolean }) {
    return <div data-testid="lottie" data-loop={String(loop)} />;
  },
}));

beforeAll(() => {
  Reflect.set(globalThis, 'IS_REACT_ACT_ENVIRONMENT', true);
});

let root: Root | null = null;
let container: HTMLElement | null = null;

function mockReducedMotion(matches: boolean) {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: () => ({ matches, addEventListener: vi.fn(), removeEventListener: vi.fn() }),
  });
}

async function render() {
  const element = document.createElement('div');
  document.body.appendChild(element);
  container = element;
  const nextRoot = createRoot(element);
  root = nextRoot;
  act(() => nextRoot.render(<ApprovalLedgerAnimation />));
  await settleUntil(() => element.childElementCount > 0);
  return element;
}

const settleAttempts = 40;
const settleIntervalMs = 25;

async function settleUntil(condition: () => boolean) {
  for (let attempt = 0; attempt < settleAttempts && !condition(); attempt += 1) {
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, settleIntervalMs));
    });
  }
}

afterEach(() => {
  act(() => root?.unmount());
  container?.remove();
  root = null;
  container = null;
});

describe('ApprovalLedgerAnimation', () => {
  it('plays the shared cable animation on a loop', async () => {
    mockReducedMotion(false);
    const element = await render();
    await settleUntil(() => element.querySelector('[data-testid="lottie"]') !== null);
    expect(element.querySelector('[data-testid="lottie"]')?.getAttribute('data-loop')).toBe('true');
  });

  it('shows a still illustration when the user prefers reduced motion', async () => {
    mockReducedMotion(true);
    const element = await render();
    expect(element.querySelector('[data-testid="lottie"]')).toBeNull();
    expect(element.querySelector('[data-testid="ledger-animation-static"] svg')).not.toBeNull();
  });

  it('describes the animation for assistive technology', async () => {
    mockReducedMotion(true);
    const element = await render();
    expect(element.querySelector('[role="img"]')?.getAttribute('aria-label')).toBe(
      'Plug in your Ledger and unlock it'
    );
  });
});
