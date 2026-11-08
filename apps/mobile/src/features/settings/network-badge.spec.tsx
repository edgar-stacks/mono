import type React from 'react';

import { render } from '@testing-library/react';
import { beforeEach, describe, expect, test, vi } from 'vitest';

import { defaultNetworksKeyedById } from '@leather.io/models';

import { NetworkBadge } from './network-badge';

const mocks = vi.hoisted(() => ({
  badge: vi.fn(),
  useSettings: vi.fn(),
}));

vi.mock('@leather.io/ui/native', () => ({
  Badge(props: Record<string, unknown>) {
    mocks.badge(props);
    return null;
  },
  Pressable({ children }: { children: React.ReactNode }) {
    return children;
  },
}));

vi.mock('expo-router', () => ({
  useRouter: () => ({ navigate: vi.fn() }),
}));

vi.mock('@/store/settings/settings', () => ({
  useSettings: mocks.useSettings,
}));

describe(NetworkBadge.name, () => {
  beforeEach(() => {
    mocks.badge.mockClear();
    mocks.useSettings.mockReturnValue({ networkPreference: defaultNetworksKeyedById.testnet });
  });

  test('renders the network name with the warning variant off mainnet', () => {
    render(<NetworkBadge />);

    expect(mocks.badge).toHaveBeenCalledWith(
      expect.objectContaining({ label: defaultNetworksKeyedById.testnet.name, variant: 'warning' })
    );
  });

  test('lets a caller override the variant', () => {
    render(<NetworkBadge variant="info" />);

    expect(mocks.badge).toHaveBeenCalledWith(expect.objectContaining({ variant: 'info' }));
  });

  test('renders nothing on mainnet', () => {
    mocks.useSettings.mockReturnValue({ networkPreference: defaultNetworksKeyedById.mainnet });

    const { container } = render(<NetworkBadge />);

    expect(mocks.badge).not.toHaveBeenCalled();
    expect(container.innerHTML).toEqual('');
  });
});
