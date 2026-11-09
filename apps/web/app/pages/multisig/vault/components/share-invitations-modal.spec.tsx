import type { ReactNode } from 'react';

import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { Tooltip } from 'radix-ui';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { ToastContext } from '~/features/toasts/use-toast';

import type { Vault } from '@leather.io/models';
import type * as LeatherUi from '@leather.io/ui';

import { ShareInvitationsModal } from './share-invitations-modal';

vi.mock('@leather.io/ui', async importOriginal => ({
  ...(await importOriginal<typeof LeatherUi>()),
  Sheet({ children, isShowing }: { children: ReactNode; isShowing: boolean }) {
    return isShowing ? <>{children}</> : null;
  },
}));

const vault: Vault = {
  id: 'vault-1',
  name: 'Treasury',
  theme: null,
  icon: null,
  network: 'stx:mainnet',
  status: 'pending',
  createdBy: 'user-1',
  createdAt: '2026-11-01T00:00:00Z',
  members: [
    {
      membershipId: 'membership-1',
      address: 'SP2J6ZY48GV1EZ5V2V5RB9MP66SW86PYKKNRV9EJ7',
      name: 'Alice',
      membershipStatus: 'invited',
      user: null,
    },
  ],
};

const toast = {
  success: vi.fn(),
  error: vi.fn(),
  info: vi.fn(),
};

function renderModal(isShowing = true) {
  function Modal({ isShowing }: { isShowing: boolean }) {
    return (
      <ToastContext.Provider value={toast}>
        <Tooltip.Provider>
          <ShareInvitationsModal vault={vault} isShowing={isShowing} onClose={vi.fn()} />
        </Tooltip.Provider>
      </ToastContext.Provider>
    );
  }
  const view = render(<Modal isShowing={isShowing} />);
  return {
    close() {
      view.rerender(<Modal isShowing={false} />);
    },
  };
}

function mockClipboard(writeText: (value: string) => Promise<void>) {
  Object.defineProperty(navigator, 'clipboard', {
    configurable: true,
    value: { writeText: vi.fn(writeText) },
  });
}

function click(name: string) {
  fireEvent.click(screen.getByRole('button', { name }));
}

describe('ShareInvitationsModal', () => {
  beforeEach(() => {
    toast.success.mockReset();
    toast.error.mockReset();
  });

  afterEach(() => {
    cleanup();
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: undefined });
  });

  test('confirms a copied invite message once the write resolves', async () => {
    mockClipboard(() => Promise.resolve());
    renderModal();

    click('Copy message');

    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(expect.stringContaining('Treasury'));
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith('Invite message copied'));
    expect(toast.error).not.toHaveBeenCalled();
  });

  test('confirms a copied invite link once the write resolves', async () => {
    mockClipboard(() => Promise.resolve());
    renderModal();

    click('Copy link');

    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
      expect.stringContaining('invite=vault-1')
    );
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith('Invite link copied'));
  });

  test('reports a failed invite message copy', async () => {
    mockClipboard(() => Promise.reject(new Error('denied')));
    renderModal();

    click('Copy message');

    expect(toast.success).not.toHaveBeenCalled();
    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith('Unable to copy invite message. Try again.')
    );
  });

  test('reports a failed invite link copy', async () => {
    mockClipboard(() => Promise.reject(new Error('denied')));
    renderModal();

    click('Copy link');

    expect(toast.success).not.toHaveBeenCalled();
    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith('Unable to copy invite link. Try again.')
    );
  });

  test('ignores a copy result that arrives after the modal closes', async () => {
    const pendingWrites: (() => void)[] = [];
    mockClipboard(() => new Promise<void>(resolve => pendingWrites.push(resolve)));
    const modal = renderModal();

    click('Copy link');
    modal.close();
    await act(async () => {
      pendingWrites.forEach(resolve => resolve());
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    expect(toast.success).not.toHaveBeenCalled();
    expect(toast.error).not.toHaveBeenCalled();
  });
});
