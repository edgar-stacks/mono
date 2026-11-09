import { act } from 'react';
import { type Root, createRoot } from 'react-dom/client';

import { fireEvent, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import { ApprovalConfirm } from './approval-confirm';

const reviewMs = 1000;
const holdMs = 800;

let root: Root | null = null;
let container: HTMLElement | null = null;

function render(props: { requestKey?: string; mode?: 'tap' | 'hold'; onConfirm(): void }) {
  const element = (
    <ApprovalConfirm
      label="Approve"
      requestKey={props.requestKey ?? 'request-1'}
      mode={props.mode}
      reviewMs={reviewMs}
      holdMs={holdMs}
      onConfirm={props.onConfirm}
    />
  );
  if (!root) {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  }
  const mounted = root;
  act(() => mounted.render(element));
}

function advance(ms: number) {
  act(() => {
    vi.advanceTimersByTime(ms);
  });
}

function button() {
  return screen.getByRole('button');
}

describe('ApprovalConfirm', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  });

  afterEach(() => {
    const mounted = root;
    if (mounted) act(() => mounted.unmount());
    container?.remove();
    root = null;
    container = null;
    vi.useRealTimers();
  });

  test('ignores clicks before the minimum review time', () => {
    const onConfirm = vi.fn();
    render({ onConfirm });

    act(() => {
      fireEvent.click(button());
    });
    advance(reviewMs - 1);
    act(() => {
      fireEvent.click(button());
    });
    expect(onConfirm).not.toHaveBeenCalled();

    advance(1);
    act(() => {
      fireEvent.click(button());
    });
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  test('confirms a request once', () => {
    const onConfirm = vi.fn();
    render({ onConfirm });
    advance(reviewMs);

    act(() => {
      fireEvent.click(button());
    });
    act(() => {
      fireEvent.click(button());
    });
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  test('needs fresh review time when the request changes', () => {
    const onConfirm = vi.fn();
    render({ onConfirm });
    advance(reviewMs);

    render({ onConfirm, requestKey: 'request-2' });
    act(() => {
      fireEvent.click(button());
    });
    expect(onConfirm).not.toHaveBeenCalled();

    advance(reviewMs);
    act(() => {
      fireEvent.click(button());
    });
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  test('hold-to-approve fires only after a full hold', () => {
    const onConfirm = vi.fn();
    render({ onConfirm, mode: 'hold' });
    advance(reviewMs);

    act(() => {
      fireEvent.pointerDown(button());
    });
    advance(holdMs - 1);
    act(() => {
      fireEvent.pointerUp(button());
    });
    advance(holdMs);
    expect(onConfirm).not.toHaveBeenCalled();

    act(() => {
      fireEvent.pointerDown(button());
    });
    advance(holdMs);
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  test('hold-to-approve fires once', () => {
    const onConfirm = vi.fn();
    render({ onConfirm, mode: 'hold' });
    advance(reviewMs);

    act(() => {
      fireEvent.pointerDown(button());
    });
    advance(holdMs * 3);
    act(() => {
      fireEvent.pointerUp(button());
    });
    act(() => {
      fireEvent.pointerDown(button());
    });
    advance(holdMs);
    act(() => {
      fireEvent.click(button());
    });
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  test('a hold that starts before the review time does nothing', () => {
    const onConfirm = vi.fn();
    render({ onConfirm, mode: 'hold' });

    act(() => {
      fireEvent.pointerDown(button());
    });
    advance(reviewMs + holdMs);
    expect(onConfirm).not.toHaveBeenCalled();
  });

  test('hold-to-approve works from the keyboard', () => {
    const onConfirm = vi.fn();
    render({ onConfirm, mode: 'hold' });
    advance(reviewMs);

    act(() => {
      fireEvent.keyDown(button(), { key: ' ' });
    });
    advance(holdMs / 2);
    act(() => {
      fireEvent.keyUp(button(), { key: ' ' });
    });
    advance(holdMs);
    expect(onConfirm).not.toHaveBeenCalled();

    act(() => {
      fireEvent.keyDown(button(), { key: 'Enter' });
    });
    advance(holdMs);
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });
});
