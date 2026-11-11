import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, test, vi } from 'vitest';

import { OutdatedStacksAppWarningBase } from '../outdated-stacks-app-warning/outdated-stacks-app-warning-base';
import { PairLedgerDevice } from './pair-ledger-device';

const mocks = vi.hoisted(() => ({
  toConnectStepAndTryAgain: vi.fn(),
  cancelLedgerAction: vi.fn(),
  handOffLedgerFlowToFullPage: vi.fn(),
}));

function Passthrough({ children }: { children?: React.ReactNode }) {
  return <div>{children}</div>;
}

vi.mock('leather-styles/jsx', () => ({
  Box: Passthrough,
  Flex: Passthrough,
  HStack: Passthrough,
  Stack: Passthrough,
  styled: {
    a({
      children,
      href,
      rel,
      target,
    }: {
      children: React.ReactNode;
      href: string;
      rel?: string;
      target?: string;
    }) {
      return (
        <a href={href} rel={rel} target={target}>
          {children}
        </a>
      );
    },
    p({ children }: { children: React.ReactNode }) {
      return <p>{children}</p>;
    },
    span({ children }: { children: React.ReactNode }) {
      return <span>{children}</span>;
    },
  },
}));

vi.mock('@leather.io/ui', () => ({
  Button({ children, onClick }: { children: React.ReactNode; onClick(): void }) {
    return <button onClick={onClick}>{children}</button>;
  },
  ExternalLinkIcon() {
    return null;
  },
  Flag({ children, img }: { children: React.ReactNode; img: React.ReactNode }) {
    return (
      <div>
        {img}
        {children}
      </div>
    );
  },
  InfoCircleIcon() {
    return null;
  },
  Tooltip: {
    Root: Passthrough,
    Trigger: Passthrough,
    Content() {
      return null;
    },
    Arrow() {
      return null;
    },
  },
}));

vi.mock('@app/common/theme-provider', () => ({
  useThemeSwitcher: () => ({ theme: 'light' }),
}));

vi.mock('../../components/ledger-wrapper', () => ({
  LedgerWrapper({ children }: { children: React.ReactNode }) {
    return <div>{children}</div>;
  },
}));

vi.mock('../../components/ledger-title', () => ({
  LedgerTitle({ children }: { children: React.ReactNode }) {
    return <h1>{children}</h1>;
  },
}));

vi.mock('@app/features/ledger/flow/ledger-flow.context', () => ({
  useLedgerStep: () => ({
    name: 'outdated-stacks-app',
    versionInfo: { currentVersion: '0.24.0', requiredVersion: '0.25.0' },
  }),
  useLedgerSteps: () => ({
    toConnectStepAndTryAgain: mocks.toConnectStepAndTryAgain,
    cancelLedgerAction: mocks.cancelLedgerAction,
  }),
}));

vi.mock('@app/features/ledger/flow/ledger-flow-handoff', () => ({
  handOffLedgerFlowToFullPage: mocks.handOffLedgerFlowToFullPage,
}));

describe(PairLedgerDevice.name, () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('hands the pairing flow off to a full tab and closes the window', () => {
    render(<PairLedgerDevice />);

    fireEvent.click(screen.getByRole('button', { name: 'Open Leather in full screen' }));

    expect(mocks.handOffLedgerFlowToFullPage).toHaveBeenCalledWith(
      { kind: 'pair-device' },
      { closeCurrentWindow: true }
    );
  });

  test('retries the connection on demand without leaving the window', () => {
    render(<PairLedgerDevice />);

    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));

    expect(mocks.toConnectStepAndTryAgain).toHaveBeenCalledOnce();
    expect(mocks.handOffLedgerFlowToFullPage).not.toHaveBeenCalled();
  });
});

describe(OutdatedStacksAppWarningBase.name, () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('offers a Ledger Wallet download link alongside the open link', () => {
    render(<OutdatedStacksAppWarningBase onTryAgain={vi.fn()} />);

    const downloadLink = screen.getByRole('link', {
      name: 'Not installed? Download Ledger Wallet',
    });
    expect(downloadLink.getAttribute('href')).toEqual(
      'https://www.ledger.com/ledger-live/download'
    );
    expect(downloadLink.getAttribute('target')).toEqual('_blank');
    expect(downloadLink.getAttribute('rel')).toEqual('noopener noreferrer');
    expect(screen.getByRole('link', { name: /Open Ledger Wallet/ }).getAttribute('href')).toEqual(
      'ledgerlive://manager'
    );
  });

  test('mentions the former Ledger Live name once', () => {
    render(<OutdatedStacksAppWarningBase onTryAgain={vi.fn()} />);

    expect(screen.getAllByText(/formerly Ledger Live/)).toHaveLength(1);
  });

  test('keeps try again and cancel working after opening Ledger Wallet', () => {
    const onTryAgain = vi.fn();
    render(<OutdatedStacksAppWarningBase onTryAgain={onTryAgain} />);

    fireEvent.click(screen.getByRole('link', { name: /Open Ledger Wallet/ }));
    fireEvent.focus(window);
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(onTryAgain).toHaveBeenCalledOnce();
    expect(mocks.cancelLedgerAction).toHaveBeenCalledOnce();
  });
});
