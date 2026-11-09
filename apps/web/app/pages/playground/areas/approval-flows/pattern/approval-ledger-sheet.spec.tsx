import { type ReactElement, act } from 'react';
import { type Root, createRoot } from 'react-dom/client';

import { fireEvent } from '@testing-library/react';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

import { ApprovalLedgerSheet, ledgerDeviceStates } from './approval-ledger-sheet';

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

describe('ApprovalLedgerSheet', () => {
  it.each(ledgerDeviceStates)('renders the %s illustration in a device dialog', state => {
    const container = mount(<ApprovalLedgerSheet state={state} chain="stacks" />);
    expect(container.querySelector('[role="dialog"]')?.getAttribute('aria-label')).toBe(
      'Ledger device'
    );
    expect(container.querySelector(`[data-illustration="${state}"]`)).not.toBeNull();
  });

  it('uses the shared signing illustration while waiting for the device', () => {
    const container = mount(<ApprovalLedgerSheet state="sign" chain="stacks" />);
    expect(container.querySelector('[data-illustration="sign"] svg')).not.toBeNull();
  });

  it('plays the cable animation while connecting', () => {
    const container = mount(<ApprovalLedgerSheet state="connect" chain="bitcoin" />);
    expect(container.querySelector('[data-testid="lottie"]')).not.toBeNull();
    expect(container.textContent).toContain('Bitcoin app');
  });

  it('names the app to open on the device', () => {
    const container = mount(<ApprovalLedgerSheet state="sign" chain="stacks" />);
    expect(container.textContent).toContain('Stacks app');
  });

  it('simulates the device buttons while signing', () => {
    const onDeviceApprove = vi.fn();
    const onDeviceReject = vi.fn();
    const container = mount(
      <ApprovalLedgerSheet
        state="sign"
        chain="stacks"
        onDeviceApprove={onDeviceApprove}
        onDeviceReject={onDeviceReject}
      />
    );
    const approve = findButton(container, 'Approve on device');
    const reject = findButton(container, 'Reject on device');
    if (!approve || !reject) throw new Error('Device buttons not rendered');
    act(() => {
      fireEvent.click(approve);
      fireEvent.click(reject);
    });
    expect(onDeviceApprove).toHaveBeenCalledTimes(1);
    expect(onDeviceReject).toHaveBeenCalledTimes(1);
  });

  it('offers a retry when the device is disconnected', () => {
    const onRetry = vi.fn();
    const container = mount(
      <ApprovalLedgerSheet state="disconnected" chain="bitcoin" onRetry={onRetry} />
    );
    const retry = findButton(container, 'Try again');
    if (!retry) throw new Error('Retry button not rendered');
    act(() => {
      fireEvent.click(retry);
    });
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('hides every action in a noninteractive preview', () => {
    const container = mount(
      <ApprovalLedgerSheet state="sign" chain="stacks" interactive={false} onCancel={vi.fn()} />
    );
    expect(container.querySelectorAll('button')).toHaveLength(0);
  });
});
