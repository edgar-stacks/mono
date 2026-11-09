import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { PageActions } from './page-actions';

function renderInForm(props: Partial<Parameters<typeof PageActions>[0]> = {}) {
  const onSubmit = vi.fn((event: { preventDefault(): void }) => event.preventDefault());
  render(
    <form onSubmit={onSubmit}>
      <PageActions primaryLabel="Continue" isPrimarySubmit {...props} />
    </form>
  );
  return { onSubmit };
}

describe('PageActions in a form', () => {
  it('submits the form from the primary action', () => {
    const { onSubmit } = renderInForm();

    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));

    expect(onSubmit).toHaveBeenCalledTimes(1);
  });

  it('does not submit the form from the secondary action', () => {
    const onSecondary = vi.fn();
    const { onSubmit } = renderInForm({ secondaryLabel: 'Cancel', onSecondary });

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(onSecondary).toHaveBeenCalledTimes(1);
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('does not submit while the primary action is disabled', () => {
    const { onSubmit } = renderInForm({ isPrimaryDisabled: true });

    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));

    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('blocks a second submit while the primary action is loading', () => {
    const { onSubmit } = renderInForm({ isPrimaryLoading: true });

    const button = screen.getByRole('button', { name: 'Continue' });
    fireEvent.click(button);

    expect(button.getAttribute('aria-busy')).toBe('true');
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('keeps the primary action a plain button outside a submit flow', () => {
    const { onSubmit } = renderInForm({ isPrimarySubmit: false });

    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));

    expect(onSubmit).not.toHaveBeenCalled();
  });
});
