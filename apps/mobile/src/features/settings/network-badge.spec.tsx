import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { type NetworkConfiguration, defaultNetworksKeyedById } from '@leather.io/models';

import { NetworkBadge } from './network-badge';

const { mockUseSettings } = vi.hoisted(() => ({
  mockUseSettings: vi.fn<() => { networkPreference: NetworkConfiguration }>(),
}));

vi.mock('@/store/settings/settings', () => ({
  useSettings: mockUseSettings,
}));

vi.mock('expo-router', () => ({
  useRouter() {
    return { navigate: vi.fn() };
  },
}));

vi.mock('@leather.io/ui/native', () => ({
  Badge({ label, variant }: { label: string; variant?: string }) {
    return <span data-variant={variant}>{label}</span>;
  },
  Pressable({ children }: { children: React.ReactNode }) {
    return <div>{children}</div>;
  },
}));

const testnet4 = defaultNetworksKeyedById.testnet4;

describe(NetworkBadge.name, () => {
  beforeEach(() => {
    mockUseSettings.mockReturnValue({ networkPreference: testnet4 });
  });

  it('renders the warning variant off mainnet', () => {
    render(<NetworkBadge />);
    expect(screen.getByText(testnet4.name).getAttribute('data-variant')).toBe('warning');
  });

  it('lets the caller override the variant', () => {
    render(<NetworkBadge variant="info" />);
    expect(screen.getByText(testnet4.name).getAttribute('data-variant')).toBe('info');
  });

  it('renders nothing on mainnet', () => {
    mockUseSettings.mockReturnValue({ networkPreference: defaultNetworksKeyedById.mainnet });
    const { container } = render(<NetworkBadge />);
    expect(container.innerHTML).toBe('');
  });
});
