import React, { isValidElement } from 'react';

import { beforeEach, describe, expect, test, vi } from 'vitest';

import { defaultNetworksKeyedById } from '@leather.io/models';

import { NetworkBadge } from './network-badge';

Object.assign(globalThis, { React });

const mockSettings = { networkPreference: defaultNetworksKeyedById.testnet };

vi.mock('expo-router', () => ({ useRouter: () => ({ navigate: vi.fn() }) }));
vi.mock('@/store/settings/settings', () => ({ useSettings: () => mockSettings }));
vi.mock('@leather.io/ui/native', () => ({
  Badge: () => null,
  Pressable: () => null,
}));

function getBadgeProps(element: unknown) {
  if (!isValidElement<{ children: unknown }>(element)) return null;
  const badge = element.props.children;
  if (!isValidElement<Record<string, unknown>>(badge)) return null;
  return badge.props;
}

describe(NetworkBadge.name, () => {
  beforeEach(() => {
    mockSettings.networkPreference = defaultNetworksKeyedById.testnet;
  });

  test('that it renders nothing on mainnet', () => {
    mockSettings.networkPreference = defaultNetworksKeyedById.mainnet;
    expect(NetworkBadge({})).toBeNull();
  });

  test('that it renders the warning variant off mainnet', () => {
    const props = getBadgeProps(NetworkBadge({}));
    expect(props?.variant).toEqual('warning');
    expect(props?.label).toEqual(defaultNetworksKeyedById.testnet.name);
  });

  test('that a caller variant overrides the warning variant', () => {
    const props = getBadgeProps(NetworkBadge({ variant: 'info' }));
    expect(props?.variant).toEqual('info');
  });
});
