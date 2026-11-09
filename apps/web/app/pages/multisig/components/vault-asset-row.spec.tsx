// @vitest-environment jsdom
import { type ReactElement, act } from 'react';
import { createRoot } from 'react-dom/client';

import { afterEach, beforeAll, describe, expect, it } from 'vitest';

import { stxAsset } from '@leather.io/constants';
import { createMoney, getAssetId, serializeAssetId } from '@leather.io/utils';

import { VaultAssetRow } from './vault-asset-row';

const mounted: { root: ReturnType<typeof createRoot>; container: HTMLElement }[] = [];

function mount(element: ReactElement) {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);
  act(() => {
    root.render(element);
  });
  mounted.push({ root, container });
  return container;
}

function makeStxItem(cryptoAmount: number, fiatAmount: number, hasFiatValue: boolean) {
  return {
    id: serializeAssetId(getAssetId(stxAsset)),
    asset: stxAsset,
    crypto: createMoney(cryptoAmount, 'STX', stxAsset.decimals),
    fiat: createMoney(fiatAmount, 'USD'),
    hasFiatValue,
  };
}

beforeAll(() => {
  Reflect.set(globalThis, 'IS_REACT_ACT_ENVIRONMENT', true);
});

afterEach(() => {
  while (mounted.length) {
    const instance = mounted.pop();
    if (!instance) continue;
    act(() => {
      instance.root.unmount();
    });
    instance.container.remove();
  }
});

describe('VaultAssetRow', () => {
  it('shows No price instead of a zero fiat value when the price is unknown', () => {
    const container = mount(<VaultAssetRow item={makeStxItem(500, 0, false)} />);
    expect(container.textContent).toContain('No price');
    expect(container.textContent).not.toContain('$0.00');
  });

  it('shows the fiat value when it is known', () => {
    const container = mount(<VaultAssetRow item={makeStxItem(500, 1200, true)} />);
    expect(container.textContent).toContain('$12.00');
    expect(container.textContent).not.toContain('No price');
  });

  it('shows a zero fiat value for a pinned asset with a zero balance', () => {
    const container = mount(<VaultAssetRow item={makeStxItem(0, 0, true)} />);
    expect(container.textContent).toContain('$0.00');
  });
});
