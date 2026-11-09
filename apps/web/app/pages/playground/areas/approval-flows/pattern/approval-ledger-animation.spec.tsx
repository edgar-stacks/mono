import { type MutableRefObject, type ReactElement, act } from 'react';
import { type Root, createRoot } from 'react-dom/client';

import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { ApprovalLedgerAnimation, connectedFrame } from './approval-ledger-animation';

interface LottieMockProps {
  autoplay?: boolean;
  loop?: boolean;
  lottieRef?: MutableRefObject<unknown>;
  onDOMLoaded?(): void;
}

const lottieMock = vi.hoisted(() => {
  const props: { autoplay?: boolean; loop?: boolean }[] = [];
  return { goToAndStop: vi.fn(), props };
});

vi.mock('lottie-react', () => ({
  default: function LottieMock({ autoplay, loop, lottieRef, onDOMLoaded }: LottieMockProps) {
    lottieMock.props.push({ autoplay, loop });
    if (lottieRef) lottieRef.current = { goToAndStop: lottieMock.goToAndStop };
    onDOMLoaded?.();
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

function stubReducedMotion(matches: boolean) {
  vi.stubGlobal('matchMedia', () => ({
    matches,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }));
}

beforeAll(() => {
  Reflect.set(globalThis, 'IS_REACT_ACT_ENVIRONMENT', true);
});

beforeEach(() => {
  lottieMock.goToAndStop.mockClear();
  lottieMock.props.length = 0;
});

afterEach(() => {
  while (mounted.length) {
    const instance = mounted.pop();
    if (!instance) continue;
    act(() => instance.root.unmount());
    instance.container.remove();
  }
  vi.unstubAllGlobals();
});

function lastProps() {
  return lottieMock.props[lottieMock.props.length - 1];
}

describe('ApprovalLedgerAnimation', () => {
  it('loops the cable animation by default', () => {
    stubReducedMotion(false);
    const container = mount(<ApprovalLedgerAnimation />);
    expect(lastProps()).toEqual({ autoplay: true, loop: true });
    expect(lottieMock.goToAndStop).not.toHaveBeenCalled();
    expect(container.querySelector('[data-motion]')?.getAttribute('data-motion')).toBe('animated');
  });

  it('holds the connected frame when the user prefers reduced motion', () => {
    stubReducedMotion(true);
    const container = mount(<ApprovalLedgerAnimation />);
    expect(lastProps()).toEqual({ autoplay: false, loop: false });
    expect(lottieMock.goToAndStop).toHaveBeenCalledWith(connectedFrame, true);
    expect(container.querySelector('[data-motion]')?.getAttribute('data-motion')).toBe('still');
  });

  it('keeps a noninteractive preview on the connected frame', () => {
    stubReducedMotion(false);
    mount(<ApprovalLedgerAnimation interactive={false} />);
    expect(lastProps()).toEqual({ autoplay: false, loop: false });
    expect(lottieMock.goToAndStop).toHaveBeenCalledWith(connectedFrame, true);
  });

  it('stops on the last frame of the animation', () => {
    expect(connectedFrame).toBeGreaterThan(0);
  });
});
