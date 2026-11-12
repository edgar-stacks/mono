import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, test, vi } from 'vitest';

import { PageActions } from './page-actions';

function renderInForm(onSubmit: () => void, onCancel: () => void) {
  render(
    <form
      onSubmit={event => {
        event.preventDefault();
        onSubmit();
      }}
    >
      <PageActions
        primary={{ label: 'Confirm', type: 'submit' }}
        secondary={{ label: 'Cancel', onClick: onCancel }}
      />
    </form>
  );
}

describe('PageActions in a form', () => {
  afterEach(cleanup);

  test('the primary action submits the form', () => {
    const onSubmit = vi.fn();
    renderInForm(onSubmit, vi.fn());

    fireEvent.click(screen.getByRole('button', { name: 'Confirm' }));

    expect(onSubmit).toHaveBeenCalledTimes(1);
  });

  test('the secondary action does not submit the form', () => {
    const onSubmit = vi.fn();
    const onCancel = vi.fn();
    renderInForm(onSubmit, onCancel);

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(onSubmit).not.toHaveBeenCalled();
  });

  test('the primary action is a plain button unless asked to submit', () => {
    const onSubmit = vi.fn();
    render(
      <form onSubmit={onSubmit}>
        <PageActions primary={{ label: 'Continue' }} />
      </form>
    );

    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));

    expect(onSubmit).not.toHaveBeenCalled();
  });

  test('a loading primary action is disabled and busy', () => {
    render(<PageActions primary={{ label: 'Confirm', isLoading: true }} />);

    const button = screen.getByRole('button', { name: 'Confirm' });
    expect(button).toHaveProperty('disabled', true);
    expect(button.getAttribute('aria-busy')).toBe('true');
  });
});
