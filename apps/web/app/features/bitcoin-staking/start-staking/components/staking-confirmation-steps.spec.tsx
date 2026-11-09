import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { bitcoinStakingContent } from '~/content/bitcoin-staking-content';
import { type BitcoinStakingPool, getStakingPoolFromSlug } from '~/data/bitcoin-staking-data';

import { useStakingAcknowledgment } from '../../hooks/use-staking-acknowledgment';
import { type StakingConnectAction } from '../../hooks/use-staking-connect-action';
import { StakingConfirmationSteps } from './staking-confirmation-steps';

interface ConfirmationHarnessProps {
  pool?: BitcoinStakingPool | null;
  onConfirm(): void;
  isBusy?: boolean;
  connectAction?: StakingConnectAction;
  entered?: { stakeAmount: number | undefined; cycles: number | undefined };
}

function ConfirmationHarness({
  pool = null,
  onConfirm,
  isBusy,
  connectAction = { status: 'connected' },
  entered = { stakeAmount: 3200, cycles: 12 },
}: ConfirmationHarnessProps) {
  const acknowledgment = useStakingAcknowledgment('fast-pool:3200:12');
  return (
    <StakingConfirmationSteps
      pool={pool}
      stakeAmount={entered.stakeAmount}
      cycles={entered.cycles}
      estimatedUnlockDate={new Date('2027-03-25T12:00:00Z')}
      acknowledgment={acknowledgment}
      connectAction={connectAction}
      onConfirm={onConfirm}
      isBusy={isBusy}
    />
  );
}

beforeEach(() => {
  vi.stubGlobal('matchMedia', () => ({ matches: true }));
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe(StakingConfirmationSteps.name, () => {
  test('requires explicit acknowledgment, keeps the terms link independent, and supports unchecking', () => {
    const onConfirm = vi.fn();
    render(<ConfirmationHarness onConfirm={onConfirm} />);
    const confirm = screen.getByRole('button', { name: 'Confirm and start staking' });
    const checkbox = screen.getByRole('checkbox');
    expect(confirm.hasAttribute('disabled')).toBe(false);
    expect(checkbox).toHaveProperty('checked', false);
    expect(checkbox.hasAttribute('aria-invalid')).toBe(false);
    const link = screen.getByRole('link', { name: 'Leather terms (opens in a new tab)' });
    expect(link.getAttribute('href')).toBe('https://leather.io/terms');
    expect(link.getAttribute('target')).toBe('_blank');
    fireEvent.click(link);
    expect(checkbox).toHaveProperty('checked', false);
    fireEvent.click(confirm);
    expect(onConfirm).not.toHaveBeenCalled();
    expect(checkbox.getAttribute('aria-invalid')).toBe('true');
    expect(screen.getByRole('alert').textContent).toBe(
      bitcoinStakingContent.acknowledgment.requiredMessage
    );
    fireEvent.click(screen.getByText(bitcoinStakingContent.acknowledgment.label));
    expect(checkbox).toHaveProperty('checked', true);
    expect(checkbox.hasAttribute('aria-invalid')).toBe(false);
    expect(screen.getByRole('alert').textContent).toBe('');
    fireEvent.click(confirm);
    expect(onConfirm).toHaveBeenCalledTimes(1);
    fireEvent.click(checkbox);
    fireEvent.click(confirm);
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  test('prevents changes and duplicate confirmation during submission', () => {
    const onConfirm = vi.fn();
    render(<ConfirmationHarness onConfirm={onConfirm} isBusy />);
    expect(screen.getByRole('checkbox').hasAttribute('disabled')).toBe(true);
    fireEvent.click(screen.getByRole('button', { name: 'Confirm and start staking' }));
    expect(onConfirm).not.toHaveBeenCalled();
  });

  test('shows a placeholder and no cycles before an amount and cycles are entered', () => {
    render(
      <ConfirmationHarness
        onConfirm={vi.fn()}
        entered={{ stakeAmount: undefined, cycles: undefined }}
      />
    );
    expect(screen.getByText('—')).toBeTruthy();
    expect(screen.queryByText(/cycles?$/)).toBeNull();
  });

  test.each([
    { pool: getStakingPoolFromSlug('fast-pool'), text: /claimed through Fast Pool's contract/ },
    { pool: getStakingPoolFromSlug('stacking-dao'), text: /You must claim your sBTC rewards/ },
    { pool: getStakingPoolFromSlug('planbetter'), text: /rely on the operator/ },
    { pool: null, text: /custom signer-manager contract/ },
  ])('explains the payout arrangement for $pool.name', ({ pool, text }) => {
    render(<ConfirmationHarness pool={pool} onConfirm={vi.fn()} />);
    expect(screen.getByText(text)).toBeTruthy();
    expect(screen.queryByText(/read and accepted.*terms/)).toBeNull();
  });

  test.each<{ status: 'install' | 'connect'; title: string; action: string }>([
    { status: 'install', title: 'Install Leather to stake', action: 'Install' },
    { status: 'connect', title: 'Connect Leather to stake', action: 'Connect' },
  ])('asks to $action Leather before the terms and confirmation', ({ status, title, action }) => {
    const run = vi.fn();
    const onConfirm = vi.fn();
    render(<ConfirmationHarness onConfirm={onConfirm} connectAction={{ status, run }} />);
    expect(screen.getByText(title)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: action }));
    expect(run).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('checkbox').hasAttribute('disabled')).toBe(true);
    const confirm = screen.getByRole('button', { name: 'Confirm and start staking' });
    expect(confirm.hasAttribute('disabled')).toBe(true);
    fireEvent.click(confirm);
    expect(onConfirm).not.toHaveBeenCalled();
  });

  test('omits the connect step once connected', () => {
    render(<ConfirmationHarness onConfirm={vi.fn()} connectAction={{ status: 'connected' }} />);
    expect(screen.queryByTestId('staking-connect-step')).toBeNull();
    expect(screen.queryByText('Install Leather to stake')).toBeNull();
    expect(screen.queryByText('Connect Leather to stake')).toBeNull();
  });

  test('keeps the stake step loading while the wallet state is unknown', () => {
    render(<ConfirmationHarness onConfirm={vi.fn()} connectAction={{ status: 'pending' }} />);
    expect(screen.queryByTestId('staking-connect-step')).toBeNull();
    const confirm = screen.getByRole('button', { name: 'Confirm and start staking' });
    expect(confirm.hasAttribute('disabled')).toBe(true);
    expect(confirm.getAttribute('aria-busy')).toBe('true');
  });
});
