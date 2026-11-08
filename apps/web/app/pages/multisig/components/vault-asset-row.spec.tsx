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

const stxId = serializeAssetId(getAssetId(stxAsset));

describe('VaultAssetRow', () => {
  it('shows No price for a held asset without a fiat value', () => {
    const container = mount(
      <VaultAssetRow
        item={{
          id: stxId,
          asset: stxAsset,
          crypto: createMoney(5_000_000, 'STX'),
          fiat: null,
        }}
      />
    );
    expect(container.textContent).toContain('No price');
    expect(container.textContent).not.toContain('$0.00');
  });

  it('shows the fiat value of a priced asset', () => {
    const container = mount(
      <VaultAssetRow
        item={{
          id: stxId,
          asset: stxAsset,
          crypto: createMoney(5_000_000, 'STX'),
          fiat: createMoney(1000, 'USD'),
        }}
      />
    );
    expect(container.textContent).toContain('$10.00');
    expect(container.textContent).not.toContain('No price');
  });

  it('shows $0.00 for a pinned asset with a zero balance', () => {
    const container = mount(
      <VaultAssetRow
        item={{
          id: stxId,
          asset: stxAsset,
          crypto: createMoney(0, 'STX'),
          fiat: createMoney(0, 'USD'),
        }}
      />
    );
    expect(container.textContent).toContain('$0.00');
    expect(container.textContent).not.toContain('No price');
  });
});
