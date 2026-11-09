import { type ReactElement, act } from 'react';
import { type Root, createRoot } from 'react-dom/client';

import { fireEvent } from '@testing-library/react';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { ApprovalConfirm, holdToApproveMs, minimumReviewMs } from './approval-confirm';

const mounted: { root: Root; container: HTMLElement }[] = [];

function mount(element: ReactElement) {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);
  act(() => root.render(element));
  mounted.push({ root, container });
  return {
    container,
    rerender(next: ReactElement) {
      act(() => root.render(next));
    },
  };
}

function getButton(container: HTMLElement) {
  const button = container.querySelector('button');
  if (!button) throw new Error('Confirm button not rendered');
  return button;
}

function advance(ms: number) {
  act(() => {
    vi.advanceTimersByTime(ms);
  });
}

function click(element: HTMLElement) {
  act(() => {
    fireEvent.click(element);
  });
}

beforeAll(() => {
  Reflect.set(globalThis, 'IS_REACT_ACT_ENVIRONMENT', true);
});

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  while (mounted.length) {
    const instance = mounted.pop();
    if (!instance) continue;
    act(() => instance.root.unmount());
    instance.container.remove();
  }
  vi.useRealTimers();
});

describe('ApprovalConfirm', () => {
  it('ignores clicks before the minimum review time', () => {
    const onConfirm = vi.fn();
    const { container } = mount(
      <ApprovalConfirm label="Approve" requestKey="r1" onConfirm={onConfirm} />
    );
    const button = getButton(container);
    expect(button.getAttribute('aria-disabled')).toBe('true');
    click(button);
    advance(minimumReviewMs - 1);
    click(button);
    expect(onConfirm).not.toHaveBeenCalled();
    advance(1);
    expect(button.getAttribute('aria-disabled')).toBe('false');
    click(button);
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it('fires only once per request', () => {
    const onConfirm = vi.fn();
    const { container } = mount(
      <ApprovalConfirm label="Approve" requestKey="r1" onConfirm={onConfirm} />
    );
    advance(minimumReviewMs);
    click(getButton(container));
    click(getButton(container));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it('needs fresh review time when the request changes', () => {
    const onConfirm = vi.fn();
    const { container, rerender } = mount(
      <ApprovalConfirm label="Approve" requestKey="r1" onConfirm={onConfirm} />
    );
    advance(minimumReviewMs);
    rerender(<ApprovalConfirm label="Approve" requestKey="r2" onConfirm={onConfirm} />);
    click(getButton(container));
    expect(onConfirm).not.toHaveBeenCalled();
    advance(minimumReviewMs);
    click(getButton(container));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it('fires hold-to-approve once, only after a full hold', () => {
    const onConfirm = vi.fn();
    const { container } = mount(
      <ApprovalConfirm label="Approve" requestKey="r1" onConfirm={onConfirm} hold />
    );
    advance(minimumReviewMs);
    const button = getButton(container);
    expect(button.textContent).toBe('Hold to approve');

    act(() => {
      fireEvent.pointerDown(button);
    });
    advance(holdToApproveMs - 1);
    act(() => {
      fireEvent.pointerUp(button);
    });
    advance(holdToApproveMs);
    expect(onConfirm).not.toHaveBeenCalled();

    act(() => {
      fireEvent.pointerDown(button);
    });
    advance(holdToApproveMs);
    expect(onConfirm).toHaveBeenCalledTimes(1);

    act(() => {
      fireEvent.pointerUp(button);
      fireEvent.pointerDown(button);
    });
    advance(holdToApproveMs);
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it('ignores a hold that starts before the minimum review time', () => {
    const onConfirm = vi.fn();
    const { container } = mount(
      <ApprovalConfirm label="Approve" requestKey="r1" onConfirm={onConfirm} hold />
    );
    act(() => {
      fireEvent.pointerDown(getButton(container));
    });
    advance(minimumReviewMs + holdToApproveMs);
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it('ignores a click in hold mode', () => {
    const onConfirm = vi.fn();
    const { container } = mount(
      <ApprovalConfirm label="Approve" requestKey="r1" onConfirm={onConfirm} hold />
    );
    advance(minimumReviewMs);
    click(getButton(container));
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it('cancels a hold when the pointer leaves', () => {
    const onConfirm = vi.fn();
    const { container } = mount(
      <ApprovalConfirm label="Approve" requestKey="r1" onConfirm={onConfirm} hold />
    );
    advance(minimumReviewMs);
    const button = getButton(container);
    act(() => {
      fireEvent.pointerDown(button);
    });
    advance(holdToApproveMs / 2);
    act(() => {
      fireEvent.pointerLeave(button);
    });
    advance(holdToApproveMs);
    expect(onConfirm).not.toHaveBeenCalled();
  });
});
