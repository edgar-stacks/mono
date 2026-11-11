import { type ReactNode, act } from 'react';
import { type Root, createRoot } from 'react-dom/client';

import { fireEvent } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ApprovalConfirm } from './approval-confirm';

const minReviewMs = 1000;
const holdMs = 800;

let root: Root | null = null;
let container: HTMLElement | null = null;

function render(children: ReactNode) {
  container = document.createElement('div');
  document.body.appendChild(container);
  const nextRoot = createRoot(container);
  root = nextRoot;
  act(() => nextRoot.render(children));
}

function rerender(children: ReactNode) {
  act(() => root?.render(children));
}

function button() {
  const element = container?.querySelector('button');
  if (!element) throw new Error('Confirm button not rendered');
  return element;
}

function advance(ms: number) {
  act(() => {
    vi.advanceTimersByTime(ms);
  });
}

function click() {
  act(() => {
    fireEvent.click(button());
  });
}

function pointer(type: 'pointerDown' | 'pointerUp') {
  act(() => {
    fireEvent[type](button());
  });
}

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  act(() => root?.unmount());
  container?.remove();
  root = null;
  container = null;
  vi.useRealTimers();
});

describe('ApprovalConfirm', () => {
  it('ignores clicks before the minimum review time', () => {
    const onConfirm = vi.fn();
    render(
      <ApprovalConfirm
        label="Approve"
        reviewKey="r1"
        onConfirm={onConfirm}
        minReviewMs={minReviewMs}
      />
    );
    expect(button().getAttribute('aria-disabled')).toBe('true');
    click();
    advance(minReviewMs - 100);
    click();
    expect(onConfirm).not.toHaveBeenCalled();

    advance(100);
    expect(button().getAttribute('aria-disabled')).toBe('false');
    click();
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it('confirms only once for repeated clicks', () => {
    const onConfirm = vi.fn();
    render(
      <ApprovalConfirm
        label="Approve"
        reviewKey="r1"
        onConfirm={onConfirm}
        minReviewMs={minReviewMs}
      />
    );
    advance(minReviewMs);
    click();
    click();
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it('needs fresh review time when the request changes', () => {
    const onConfirm = vi.fn();
    render(
      <ApprovalConfirm
        label="Approve"
        reviewKey="r1"
        onConfirm={onConfirm}
        minReviewMs={minReviewMs}
      />
    );
    advance(minReviewMs);
    rerender(
      <ApprovalConfirm
        label="Approve"
        reviewKey="r2"
        onConfirm={onConfirm}
        minReviewMs={minReviewMs}
      />
    );
    click();
    expect(onConfirm).not.toHaveBeenCalled();
    advance(minReviewMs);
    click();
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it('fires a hold only after the full hold', () => {
    const onConfirm = vi.fn();
    render(
      <ApprovalConfirm
        label="Approve"
        reviewKey="r1"
        mode="hold"
        onConfirm={onConfirm}
        minReviewMs={minReviewMs}
        holdMs={holdMs}
      />
    );
    advance(minReviewMs);
    pointer('pointerDown');
    advance(holdMs - 1);
    pointer('pointerUp');
    advance(holdMs);
    expect(onConfirm).not.toHaveBeenCalled();

    pointer('pointerDown');
    advance(holdMs);
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it('fires a hold once only', () => {
    const onConfirm = vi.fn();
    render(
      <ApprovalConfirm
        label="Approve"
        reviewKey="r1"
        mode="hold"
        onConfirm={onConfirm}
        minReviewMs={minReviewMs}
        holdMs={holdMs}
      />
    );
    advance(minReviewMs);
    pointer('pointerDown');
    advance(holdMs * 3);
    pointer('pointerUp');
    pointer('pointerDown');
    advance(holdMs);
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it('ignores a hold that starts before the minimum review time', () => {
    const onConfirm = vi.fn();
    render(
      <ApprovalConfirm
        label="Approve"
        reviewKey="r1"
        mode="hold"
        onConfirm={onConfirm}
        minReviewMs={minReviewMs}
        holdMs={holdMs}
      />
    );
    pointer('pointerDown');
    advance(holdMs + minReviewMs);
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it('ignores a click in hold mode', () => {
    const onConfirm = vi.fn();
    render(
      <ApprovalConfirm
        label="Approve"
        reviewKey="r1"
        mode="hold"
        onConfirm={onConfirm}
        minReviewMs={minReviewMs}
        holdMs={holdMs}
      />
    );
    advance(minReviewMs);
    click();
    expect(onConfirm).not.toHaveBeenCalled();
    expect(button().textContent).toBe('Hold to approve');
  });
});
