import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { Tooltip } from 'radix-ui';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { AddressQr } from './address-qr';
import { AmountDisplay } from './amount-display';
import { PageActions } from './page-actions';
import { PageHeader } from './page-header';
import { PopupPage } from './popup-page';
import { ReviewSheet } from './review-sheet';
import { TabPage } from './tab-page';

const address = 'bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh';

function flushPromises() {
  return new Promise<void>(resolve => setTimeout(resolve, 0));
}

describe('recipe composition', () => {
  afterEach(() => {
    cleanup();
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: undefined });
  });

  it('places the popup page header, body and footer in order', () => {
    render(
      <PopupPage
        header={<PageHeader title="Send" onBack={vi.fn()} />}
        footer={<PageActions primaryLabel="Continue" />}
      >
        <p>Body</p>
      </PopupPage>
    );

    const heading = screen.getByRole('heading', { name: 'Send' });
    const body = screen.getByText('Body');
    const action = screen.getByRole('button', { name: 'Continue' });
    expect(heading.compareDocumentPosition(body) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(body.compareDocumentPosition(action) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Back' })).toBeTruthy();
  });

  it('renders amounts with tabular figures and a fiat caption', () => {
    render(<AmountDisplay amount="0.0125" symbol="BTC" fiat="$1,204.18" />);

    expect(screen.getByText('0.0125 BTC').className).toContain('tabular-nums');
    expect(screen.getByText('$1,204.18')).toBeTruthy();
  });

  it('shows the QR and confirms the copy only after the write resolves', async () => {
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText: vi.fn(() => Promise.resolve()) },
    });
    render(<AddressQr address={address} />);

    expect(screen.getByLabelText('Address QR code')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Copy address' }));
    await act(flushPromises);
    expect(screen.getByRole('button', { name: 'Copied' })).toBeTruthy();
  });

  it('reports a failed address copy', async () => {
    render(<AddressQr address={address} />);

    fireEvent.click(screen.getByRole('button', { name: 'Copy address' }));
    await act(flushPromises);
    expect(screen.getByRole('status').textContent).toBe('Unable to copy the address');
  });

  it('puts the review sheet actions in its footer', () => {
    const onConfirm = vi.fn();
    const onClose = vi.fn();
    render(
      <Tooltip.Provider>
        <ReviewSheet
          title="Review"
          isShowing
          onClose={onClose}
          onConfirm={onConfirm}
          confirmLabel="Confirm and send"
        >
          <p>Summary</p>
        </ReviewSheet>
      </Tooltip.Provider>
    );

    const dialog = screen.getByRole('dialog');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Confirm and send' }));
    fireEvent.click(within(dialog).getByRole('button', { name: 'Cancel' }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('opens the first tab of a tab page by default', () => {
    render(
      <TabPage
        tabs={[
          { id: 'tokens', label: 'Tokens', content: <p>Token list</p> },
          { id: 'collectibles', label: 'Collectibles', content: <p>Collectible grid</p> },
        ]}
      />
    );

    expect(screen.getByRole('tab', { name: 'Tokens' }).getAttribute('aria-selected')).toBe('true');
    expect(screen.getByText('Token list')).toBeTruthy();
    expect(screen.queryByText('Collectible grid')).toBeNull();
  });
});
