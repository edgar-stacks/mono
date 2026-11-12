import { type ReactNode } from 'react';

import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import type { Vault } from '@leather.io/models';
import { Tooltip } from '@leather.io/ui';
import type * as LeatherUi from '@leather.io/ui';

import { ShareInvitationsModal } from './share-invitations-modal';

const toast = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn(), info: vi.fn() }));

vi.mock('~/features/toasts/use-toast', () => ({
  useToast() {
    return toast;
  },
}));

vi.mock('@leather.io/ui', async importOriginal => ({
  ...(await importOriginal<typeof LeatherUi>()),
  Sheet({ children }: { children: ReactNode }) {
    return <>{children}</>;
  },
}));

const originalClipboard = Object.getOwnPropertyDescriptor(navigator, 'clipboard');

const vault: Vault = {
  id: 'vault-1',
  name: 'Team Treasury',
  theme: null,
  icon: null,
  network: 'btc:mainnet',
  status: 'pending',
  createdBy: 'user-1',
  createdAt: '',
  members: [
    {
      membershipId: 'membership-1',
      address: 'bc1qcreator0000000000000000000000000000000',
      name: 'Alice',
      membershipStatus: 'joined',
      user: {
        id: 'user-1',
        address: 'bc1qcreator0000000000000000000000000000000',
        publicKey: '02creator',
        network: 'btc:mainnet',
        xpub: null,
        xpubOriginFingerprint: null,
        xpubOriginPath: null,
      },
    },
    {
      membershipId: 'membership-2',
      address: 'bc1qinvitee0000000000000000000000000000000',
      name: 'Bob',
      membershipStatus: 'invited',
      user: null,
    },
  ],
};

function setWriteText(writeText: (value: string) => Promise<void>) {
  Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
}

function renderModal(isShowing = true) {
  return render(<ShareInvitationsModal vault={vault} isShowing={isShowing} onClose={vi.fn()} />, {
    wrapper: Tooltip.Provider,
  });
}

async function clickAndSettle(name: string) {
  await act(async () => {
    fireEvent.click(screen.getByRole('button', { name }));
    await Promise.resolve();
  });
}

describe('ShareInvitationsModal', () => {
  beforeEach(() => {
    toast.success.mockReset();
    toast.error.mockReset();
  });

  afterEach(() => {
    cleanup();
    if (originalClipboard) Object.defineProperty(navigator, 'clipboard', originalClipboard);
  });

  test('confirms the invite message only after it is copied', async () => {
    const writeText = vi.fn(() => Promise.resolve());
    setWriteText(writeText);
    renderModal();

    await clickAndSettle('Copy message');

    expect(writeText).toHaveBeenCalledWith(expect.stringContaining('Hey Bob,'));
    expect(toast.success).toHaveBeenCalledWith('Invite message copied');
    expect(toast.error).not.toHaveBeenCalled();
  });

  test('confirms the invite link only after it is copied', async () => {
    setWriteText(vi.fn(() => Promise.resolve()));
    renderModal();

    await clickAndSettle('Copy link');

    expect(toast.success).toHaveBeenCalledWith('Invite link copied');
  });

  test('reports a failed invite message copy', async () => {
    setWriteText(vi.fn(() => Promise.reject(new Error('denied'))));
    renderModal();

    await clickAndSettle('Copy message');

    expect(toast.success).not.toHaveBeenCalled();
    expect(toast.error).toHaveBeenCalledWith('Unable to copy invite message. Try again.');
  });

  test('reports a failed invite link copy', async () => {
    setWriteText(vi.fn(() => Promise.reject(new Error('denied'))));
    renderModal();

    await clickAndSettle('Copy link');

    expect(toast.error).toHaveBeenCalledWith('Unable to copy invite link. Try again.');
  });

  test('ignores a copy result that arrives after the modal closes', async () => {
    let resolveWrite: (() => void) | undefined;
    setWriteText(
      vi.fn(
        () =>
          new Promise<void>(resolve => {
            resolveWrite = resolve;
          })
      )
    );
    const { rerender } = renderModal();

    fireEvent.click(screen.getByRole('button', { name: 'Copy link' }));
    rerender(<ShareInvitationsModal vault={vault} isShowing={false} onClose={vi.fn()} />);

    await act(async () => {
      resolveWrite?.();
      await Promise.resolve();
    });

    expect(toast.success).not.toHaveBeenCalled();
    expect(toast.error).not.toHaveBeenCalled();
  });
});
