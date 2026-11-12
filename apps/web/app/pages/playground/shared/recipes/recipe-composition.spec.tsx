import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, test, vi } from 'vitest';

import { Button, Tooltip } from '@leather.io/ui';

import { receiveExampleAssets } from '../../areas/receive-example/receive-example-fixtures';
import {
  ChooseAssetScreen,
  ReceiveAddressScreen,
} from '../../areas/receive-example/receive-example-screens';
import { ListRow } from './list-row';
import { PageHeader } from './page-header';
import { PopupPage } from './popup-page';

function renderWithProviders(children: React.ReactNode) {
  return render(<Tooltip.Provider>{children}</Tooltip.Provider>);
}

function getRecipe(container: HTMLElement, recipe: string) {
  const element = container.querySelector(`[data-recipe="${recipe}"]`);
  if (!(element instanceof HTMLElement)) throw new Error(`Missing recipe ${recipe}`);
  return element;
}

const [bitcoin] = receiveExampleAssets;

describe('recipe composition', () => {
  afterEach(cleanup);

  test('a popup page renders its header, body and actions in order', () => {
    const { container } = renderWithProviders(
      <PopupPage header={<PageHeader title="Send" />} actions={<Button>Go</Button>}>
        <p>Body</p>
      </PopupPage>
    );

    const page = getRecipe(container, 'popup-page');
    const text = page.textContent ?? '';
    expect(text.indexOf('Send')).toBeLessThan(text.indexOf('Body'));
    expect(text.indexOf('Body')).toBeLessThan(text.indexOf('Go'));
  });

  test('a page header only renders the actions it is given', () => {
    const onBack = vi.fn();
    renderWithProviders(<PageHeader title="Receive" onBack={onBack} />);

    fireEvent.click(screen.getByRole('button', { name: 'Go back' }));

    expect(onBack).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('button', { name: 'Close' })).toBeNull();
    expect(screen.getByRole('heading', { name: 'Receive' })).toBeTruthy();
  });

  test('a list row without an action shows no chevron', () => {
    const { container } = renderWithProviders(<ListRow title="Bitcoin" caption="BTC" />);

    expect(container.querySelector('svg')).toBeNull();
  });

  test('the choose asset screen composes a popup page of list rows', () => {
    if (!bitcoin) throw new Error('Missing fixture');
    const onSelect = vi.fn();
    const { container } = renderWithProviders(<ChooseAssetScreen onSelect={onSelect} />);

    const page = getRecipe(container, 'popup-page');
    expect(within(page).getByRole('heading', { name: 'Receive' })).toBeTruthy();
    expect(within(page).getByRole('heading', { name: 'Choose an asset' })).toBeTruthy();

    fireEvent.click(within(page).getByText('Bitcoin'));

    expect(onSelect).toHaveBeenCalledWith(bitcoin);
  });

  test('the receive address screen composes identity, address QR and actions', () => {
    if (!bitcoin) throw new Error('Missing fixture');
    const onDone = vi.fn();
    const { container } = renderWithProviders(
      <ReceiveAddressScreen asset={bitcoin} onDone={onDone} />
    );

    const page = getRecipe(container, 'popup-page');
    expect(getRecipe(page, 'receive-asset-identity').textContent).toContain('Receive Bitcoin');
    expect(getRecipe(page, 'address-qr').querySelector('svg')).toBeTruthy();
    expect(getRecipe(page, 'address-qr').textContent?.replace(/\s/g, '')).toContain(
      bitcoin.address
    );

    fireEvent.click(within(getRecipe(page, 'page-actions')).getByRole('button', { name: 'Done' }));

    expect(onDone).toHaveBeenCalledTimes(1);
  });
});
