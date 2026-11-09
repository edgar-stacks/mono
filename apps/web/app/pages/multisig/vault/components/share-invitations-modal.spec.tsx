import { type ReactNode } from 'react';

import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { Tooltip } from 'radix-ui';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ToastContext } from '~/features/toasts/use-toast';

import type { Vault } from '@leather.io/models';

import { ShareInvitationsModal } from './share-invitations-modal';

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

interface DeferredHandlers {
  resolve?(): void;
  reject?(error: Error): void;
}

function deferred() {
  const handlers: DeferredHandlers = {};
  const promise = new Promise<void>((resolve, reject) => {
    handlers.resolve = resolve;
    handlers.reject = reject;
  });
  return {
    promise,
    resolve() {
      handlers.resolve?.();
    },
    reject(error: Error) {
      handlers.reject?.(error);
    },
  };
}

function mockClipboard(writeText: () => Promise<void>) {
  Object.defineProperty(navigator, 'clipboard', {
    configurable: true,
    value: { writeText: vi.fn(writeText) },
  });
}

function renderModal({ isShowing = true }: { isShowing?: boolean } = {}) {
  const toast = { success: vi.fn(), error: vi.fn(), info: vi.fn() };
  function Providers({ children }: { children: ReactNode }) {
    return (
      <ToastContext.Provider value={toast}>
        <Tooltip.Provider>{children}</Tooltip.Provider>
      </ToastContext.Provider>
    );
  }
  const view = render(
    <ShareInvitationsModal vault={vault} isShowing={isShowing} onClose={vi.fn()} />,
    {
      wrapper: Providers,
    }
  );
  return { toast, view, Providers };
}

function flushPromises() {
  return new Promise<void>(resolve => setTimeout(resolve, 0));
}

async function clickAndSettle(name: string) {
  fireEvent.click(screen.getByRole('button', { name }));
  await act(flushPromises);
}

describe('ShareInvitationsModal', () => {
  afterEach(() => {
    cleanup();
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: undefined });
  });

  it('confirms the invite message only after it is copied', async () => {
    mockClipboard(() => Promise.resolve());
    const { toast } = renderModal();

    await clickAndSettle('Copy message');

    expect(toast.success).toHaveBeenCalledWith('Invite message copied');
    expect(toast.error).not.toHaveBeenCalled();
  });

  it('confirms the invite link only after it is copied', async () => {
    mockClipboard(() => Promise.resolve());
    const { toast } = renderModal();

    await clickAndSettle('Copy link');

    expect(toast.success).toHaveBeenCalledWith('Invite link copied');
  });

  it('reports a failed message copy', async () => {
    mockClipboard(() => Promise.reject(new Error('denied')));
    const { toast } = renderModal();

    await clickAndSettle('Copy message');

    expect(toast.success).not.toHaveBeenCalled();
    expect(toast.error).toHaveBeenCalledWith('Unable to copy invite message. Try again.');
  });

  it('reports a failed link copy when the clipboard is unavailable', async () => {
    const { toast } = renderModal();

    await clickAndSettle('Copy link');

    expect(toast.error).toHaveBeenCalledWith('Unable to copy invite link. Try again.');
  });

  it('ignores a copy result that arrives after the modal closes', async () => {
    const write = deferred();
    mockClipboard(() => write.promise);
    const { toast, view } = renderModal();

    await clickAndSettle('Copy link');
    view.rerender(<ShareInvitationsModal vault={vault} isShowing={false} onClose={vi.fn()} />);
    await act(async () => {
      write.resolve();
      await write.promise;
    });

    expect(toast.success).not.toHaveBeenCalled();
    expect(toast.error).not.toHaveBeenCalled();
  });
});
