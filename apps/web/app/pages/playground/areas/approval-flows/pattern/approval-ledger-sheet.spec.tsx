import { type ReactNode, act } from 'react';
import { type Root, createRoot } from 'react-dom/client';

import { fireEvent, getByRole, queryByRole } from '@testing-library/react';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

import { ApprovalLedgerSheet, type LedgerSheetPhase } from './approval-ledger-sheet';

vi.mock('lottie-react', () => ({
  default: function LottieMock() {
    return <div data-testid="lottie" />;
  },
}));

let root: Root | null = null;
let container: HTMLElement | null = null;

beforeAll(() => {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: () => ({ matches: true, addEventListener: vi.fn(), removeEventListener: vi.fn() }),
  });
});

afterEach(() => {
  act(() => root?.unmount());
  container?.remove();
  root = null;
  container = null;
});

function render(children: ReactNode) {
  const element = document.createElement('div');
  document.body.appendChild(element);
  container = element;
  const nextRoot = createRoot(element);
  root = nextRoot;
  act(() => nextRoot.render(children));
  return element;
}

function renderSheet(phase: LedgerSheetPhase) {
  const handlers = {
    onConnect: vi.fn(),
    onApprove: vi.fn(),
    onReject: vi.fn(),
    onDisconnect: vi.fn(),
    onCancel: vi.fn(),
  };
  const element = render(
    <ApprovalLedgerSheet
      phase={phase}
      chain="bitcoin"
      deviceLines={['Review transaction', 'Send 0.0125 BTC']}
      {...handlers}
    />
  );
  return { element, handlers };
}

function click(element: HTMLElement, name: string) {
  act(() => {
    fireEvent.click(getByRole(element, 'button', { name }));
  });
}

describe('ApprovalLedgerSheet', () => {
  it('asks to connect the device and open the chain app', () => {
    const { element, handlers } = renderSheet('connect');
    expect(getByRole(element, 'dialog', { name: 'Connect your Ledger' })).toBeTruthy();
    expect(element.textContent).toContain('open the Bitcoin app');
    click(element, 'Device ready');
    expect(handlers.onConnect).toHaveBeenCalledTimes(1);
  });

  it('shows what the device displays while waiting for approval', () => {
    const { element, handlers } = renderSheet('review');
    expect(getByRole(element, 'img', { name: 'Ledger device screen' }).textContent).toContain(
      'Send 0.0125 BTC'
    );
    click(element, 'Approve on device');
    click(element, 'Reject on device');
    click(element, 'Unplug device');
    expect(handlers.onApprove).toHaveBeenCalledTimes(1);
    expect(handlers.onReject).toHaveBeenCalledTimes(1);
    expect(handlers.onDisconnect).toHaveBeenCalledTimes(1);
  });

  it('offers no actions once the device approved', () => {
    const { element } = renderSheet('approved');
    expect(getByRole(element, 'dialog', { name: 'Approved on your Ledger' })).toBeTruthy();
    expect(queryByRole(element, 'button')).toBeNull();
  });

  it('lets the user retry or cancel after a rejection', () => {
    const { element, handlers } = renderSheet('rejected');
    expect(element.textContent).toContain('Nothing was signed');
    click(element, 'Try again');
    click(element, 'Cancel');
    expect(handlers.onConnect).toHaveBeenCalledTimes(1);
    expect(handlers.onCancel).toHaveBeenCalledTimes(1);
  });

  it('explains a disconnected device', () => {
    const { element, handlers } = renderSheet('disconnected');
    expect(getByRole(element, 'dialog', { name: 'Ledger disconnected' })).toBeTruthy();
    click(element, 'Retry');
    expect(handlers.onConnect).toHaveBeenCalledTimes(1);
  });

  it('names the app to open', () => {
    const { element } = renderSheet('open-app');
    expect(getByRole(element, 'dialog', { name: 'Open the Bitcoin app' })).toBeTruthy();
  });

  it('renders the shared Ledger illustrations', () => {
    (['open-app', 'review', 'approved', 'rejected', 'disconnected'] as const).forEach(phase => {
      const { element } = renderSheet(phase);
      expect(element.querySelector('svg')).not.toBeNull();
      act(() => root?.unmount());
      element.remove();
    });
  });
});
