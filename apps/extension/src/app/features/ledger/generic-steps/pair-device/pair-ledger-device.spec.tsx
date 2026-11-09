import { createEvent, fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, test, vi } from 'vitest';

import { OutdatedStacksAppWarningBase } from '../outdated-stacks-app-warning/outdated-stacks-app-warning-base';
import { PairLedgerDevice } from './pair-ledger-device';

const mocks = vi.hoisted(() => ({
  toConnectStepAndTryAgain: vi.fn(),
  handOffLedgerFlowToFullPage: vi.fn(),
  cancelLedgerAction: vi.fn(),
}));

interface MockChildrenProps {
  children?: React.ReactNode;
}

interface MockAnchorProps extends MockChildrenProps {
  href?: string;
  target?: string;
  rel?: string;
}

function MockContainer({ children }: MockChildrenProps) {
  return <div>{children}</div>;
}

function MockFragment({ children }: MockChildrenProps) {
  return <>{children}</>;
}

vi.mock('leather-styles/jsx', () => ({
  Box: MockContainer,
  Flex: MockContainer,
  HStack: MockContainer,
  Stack: MockContainer,
  styled: {
    span({ children }: MockChildrenProps) {
      return <span>{children}</span>;
    },
    p({ children }: MockChildrenProps) {
      return <p>{children}</p>;
    },
    a({ children, href, target, rel }: MockAnchorProps) {
      return (
        <a href={href} target={target} rel={rel}>
          {children}
        </a>
      );
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
  InfoCircleIcon() {
    return null;
  },
  Flag({ children, img }: MockChildrenProps & { img?: React.ReactNode }) {
    return (
      <div>
        {img}
        {children}
      </div>
    );
  },
  Tooltip: {
    Root: MockFragment,
    Trigger: MockFragment,
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
  useLedgerSteps: () => ({
    toConnectStepAndTryAgain: mocks.toConnectStepAndTryAgain,
    cancelLedgerAction: mocks.cancelLedgerAction,
  }),
  useLedgerStep: () => ({
    name: 'outdated-stacks-app',
    versionInfo: { currentVersion: '0.24.0', requiredVersion: '0.25.0' },
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

  test('offers a download link for Ledger Wallet next to the open link', () => {
    render(<OutdatedStacksAppWarningBase onTryAgain={vi.fn()} />);

    expect(screen.getByRole('link', { name: /Open Ledger Wallet/ }).getAttribute('href')).toBe(
      'ledgerlive://manager'
    );
    const downloadLink = screen.getByRole('link', {
      name: 'Not installed? Download Ledger Wallet',
    });
    expect(downloadLink.getAttribute('href')).toBe('https://www.ledger.com/ledger-live/download');
    expect(downloadLink.getAttribute('target')).toBe('_blank');
    expect(downloadLink.getAttribute('rel')).toBe('noopener noreferrer');
  });

  test('mentions the former Ledger Live name exactly once', () => {
    render(<OutdatedStacksAppWarningBase onTryAgain={vi.fn()} />);

    expect(screen.getAllByText(/formerly Ledger Live/)).toHaveLength(1);
  });

  test('keeps try again and cancel working after opening Ledger Wallet', () => {
    const onTryAgain = vi.fn();
    render(<OutdatedStacksAppWarningBase onTryAgain={onTryAgain} />);

    const openLink = screen.getByRole('link', { name: /Open Ledger Wallet/ });
    const openClick = createEvent.click(openLink);
    openClick.preventDefault();
    fireEvent(openLink, openClick);
    fireEvent.focus(window);
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(onTryAgain).toHaveBeenCalledOnce();
    expect(mocks.cancelLedgerAction).toHaveBeenCalledOnce();
  });
});
