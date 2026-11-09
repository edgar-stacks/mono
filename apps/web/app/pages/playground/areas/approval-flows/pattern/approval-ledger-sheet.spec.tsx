import { type ReactElement, act } from 'react';
import { type Root, createRoot } from 'react-dom/client';

import { fireEvent, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import {
  ApprovalLedgerSheet,
  type LedgerSheetState,
  ledgerSheetStates,
} from './approval-ledger-sheet';

vi.mock('lottie-react', () => ({
  default: function MockLottie() {
    return <div data-testid="lottie" />;
  },
}));

let root: Root | null = null;
let container: HTMLElement | null = null;

function render(element: ReactElement) {
  container = document.createElement('div');
  document.body.appendChild(container);
  const mounted = createRoot(container);
  root = mounted;
  act(() => mounted.render(element));
  return container;
}

const expectedTitles: Record<LedgerSheetState, string> = {
  connect: 'Connect your Ledger',
  review: 'Approve on your Ledger',
  rejected: 'Rejected on your Ledger',
  disconnected: 'Ledger disconnected',
  error: 'Open the Stacks app',
  success: 'Signed on your Ledger',
};

describe('ApprovalLedgerSheet', () => {
  beforeEach(() => {
    Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  });

  afterEach(() => {
    const mounted = root;
    if (mounted) act(() => mounted.unmount());
    container?.remove();
    root = null;
  });

  test.each(ledgerSheetStates)('shows the %s state with its illustration', state => {
    const element = render(<ApprovalLedgerSheet state={state} chain="stacks" preview />);
    expect(screen.getByRole('dialog', { name: expectedTitles[state] })).toBeTruthy();
    const illustration = element.querySelector(`[data-illustration="${state}"]`);
    expect(illustration).toBeTruthy();
  });

  test('draws the shared Ledger illustrations', () => {
    const element = render(<ApprovalLedgerSheet state="review" chain="bitcoin" preview />);
    expect(element.querySelector('[data-illustration="review"] svg')).toBeTruthy();
  });

  test('names the Ledger app for the chain', () => {
    render(<ApprovalLedgerSheet state="connect" chain="bitcoin" preview />);
    expect(screen.getByText(/open the Bitcoin app/)).toBeTruthy();
  });

  test('loads the cable animation for the connect step', async () => {
    render(<ApprovalLedgerSheet state="connect" chain="stacks" preview />);
    expect(await screen.findByTestId('lottie')).toBeTruthy();
  });

  test('simulates connecting, approving and rejecting on the device', () => {
    const onConnected = vi.fn();
    const onApprove = vi.fn();
    const onReject = vi.fn();
    const onClose = vi.fn();

    render(
      <ApprovalLedgerSheet
        state="connect"
        chain="stacks"
        onConnected={onConnected}
        onClose={onClose}
      />
    );
    act(() => {
      fireEvent.click(screen.getByRole('button', { name: 'Ledger is connected' }));
    });
    expect(onConnected).toHaveBeenCalledTimes(1);
    act(() => {
      fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    });
    expect(onClose).toHaveBeenCalledTimes(1);

    const mounted = root;
    if (mounted) act(() => mounted.unmount());
    container?.remove();

    render(
      <ApprovalLedgerSheet
        state="review"
        chain="stacks"
        onApprove={onApprove}
        onReject={onReject}
      />
    );
    act(() => {
      fireEvent.click(screen.getByRole('button', { name: 'Approve on device' }));
    });
    act(() => {
      fireEvent.click(screen.getByRole('button', { name: 'Reject on device' }));
    });
    expect(onApprove).toHaveBeenCalledTimes(1);
    expect(onReject).toHaveBeenCalledTimes(1);
  });

  test('a preview offers no device actions', () => {
    render(
      <ApprovalLedgerSheet
        state="review"
        chain="stacks"
        preview
        onApprove={vi.fn()}
        onReject={vi.fn()}
      />
    );
    expect(screen.queryByRole('button')).toBeNull();
  });
});
