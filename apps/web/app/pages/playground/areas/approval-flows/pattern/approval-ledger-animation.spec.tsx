import { type RefObject, act, useEffect } from 'react';
import { type Root, createRoot } from 'react-dom/client';

import type { LottieRefCurrentProps } from 'lottie-react';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import pluggedInCable from '@leather.io/ui/assets/animations/plugged-in-cable-bright.lottie.json';

import { ApprovalLedgerAnimation } from './approval-ledger-animation';

const lottie = vi.hoisted(() => {
  const props: { autoplay?: boolean; loop?: boolean }[] = [];
  return { props, goToAndStop: vi.fn() };
});

vi.mock('lottie-react', () => ({
  default: function MockLottie(props: {
    autoplay?: boolean;
    loop?: boolean;
    lottieRef?: RefObject<Partial<LottieRefCurrentProps> | null>;
    onDOMLoaded?(): void;
  }) {
    lottie.props.push({ autoplay: props.autoplay, loop: props.loop });
    useEffect(() => {
      if (props.lottieRef) props.lottieRef.current = { goToAndStop: lottie.goToAndStop };
      props.onDOMLoaded?.();
    }, [props]);
    return <div data-testid="lottie" />;
  },
}));

let root: Root | null = null;
let container: HTMLElement | null = null;

function mockReducedMotion(reduce: boolean) {
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    value: vi.fn((query: string) => ({
      matches: reduce && query.includes('reduce'),
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })),
  });
}

function render(preview?: boolean) {
  container = document.createElement('div');
  document.body.appendChild(container);
  const mounted = createRoot(container);
  root = mounted;
  act(() => mounted.render(<ApprovalLedgerAnimation preview={preview} />));
  return container;
}

function lastProps() {
  return lottie.props[lottie.props.length - 1];
}

const connectedFrame = pluggedInCable.op - 1;

describe('ApprovalLedgerAnimation', () => {
  beforeEach(() => {
    Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
    lottie.props.length = 0;
    lottie.goToAndStop.mockReset();
  });

  afterEach(() => {
    const mounted = root;
    if (mounted) act(() => mounted.unmount());
    container?.remove();
    root = null;
  });

  test('plays the cable animation in a loop', () => {
    mockReducedMotion(false);
    const element = render();
    expect(lastProps()).toEqual({ autoplay: true, loop: true });
    expect(lottie.goToAndStop).not.toHaveBeenCalled();
    expect(element.querySelector('[data-motion]')?.getAttribute('data-motion')).toBe('animated');
  });

  test('holds the connected frame when motion is reduced', () => {
    mockReducedMotion(true);
    const element = render();
    expect(lastProps()).toEqual({ autoplay: false, loop: false });
    expect(lottie.goToAndStop).toHaveBeenCalledWith(connectedFrame, true);
    expect(element.querySelector('[data-motion]')?.getAttribute('data-motion')).toBe('still');
  });

  test('a noninteractive preview stays on the connected frame', () => {
    mockReducedMotion(false);
    render(true);
    expect(lastProps()).toEqual({ autoplay: false, loop: false });
    expect(lottie.goToAndStop).toHaveBeenCalledWith(connectedFrame, true);
  });
});
