import { vi } from 'vitest';

import type {
  DiscoveredHardwareDevice,
  HardwareBitcoinSigner,
  HardwareStacksSigner,
  HardwareWallet,
  HardwareWalletCapabilities,
  HardwareWalletConnector,
  HardwareWalletSession,
  OperationContext,
} from './hardware-wallet';

export const fakeHardwareWalletCapabilities: HardwareWalletCapabilities = {
  chains: ['bitcoin', 'stacks'],
  walletPolicies: true,
  stacksDerivationPathTypes: ['stacks', 'bip44'],
};

export const fakeDiscoveredHardwareDevice: DiscoveredHardwareDevice = {
  id: 'device-1',
  name: 'Fake hardware wallet',
  vendor: 'ledger',
};

export function makeFakeHardwareBitcoinSigner(
  overrides: Partial<HardwareBitcoinSigner> = {}
): HardwareBitcoinSigner {
  return {
    getMasterFingerprint: vi.fn(),
    requestAccountKeys: vi.fn(),
    signPsbt: vi.fn(),
    showAddress: vi.fn(),
    ...overrides,
  };
}

export function makeFakeHardwareStacksSigner(
  overrides: Partial<HardwareStacksSigner> = {}
): HardwareStacksSigner {
  return {
    getMasterFingerprint: vi.fn(),
    requestAccountKeys: vi.fn(),
    signTransaction: vi.fn(),
    signMessage: vi.fn(),
    signStructuredMessage: vi.fn(),
    showAddress: vi.fn(),
    ...overrides,
  };
}

export function makeFakeHardwareWallet(overrides: Partial<HardwareWallet> = {}): HardwareWallet {
  return {
    vendor: 'ledger',
    capabilities: fakeHardwareWalletCapabilities,
    app: null,
    bitcoin: null,
    stacks: null,
    ...overrides,
  };
}

export function makeFakeHardwareWalletSession(
  wallet: HardwareWallet = makeFakeHardwareWallet()
): HardwareWalletSession {
  return { wallet, close: vi.fn().mockResolvedValue(undefined) };
}

export function makeFakeHardwareWalletConnector(
  overrides: Partial<HardwareWalletConnector> = {}
): HardwareWalletConnector {
  return {
    vendor: 'ledger',
    capabilities: fakeHardwareWalletCapabilities,
    pair: vi.fn().mockResolvedValue(fakeDiscoveredHardwareDevice),
    connect: vi.fn().mockResolvedValue(makeFakeHardwareWalletSession()),
    ...overrides,
  };
}

export function makeFakeOperationContext(
  overrides: Partial<OperationContext> = {}
): OperationContext {
  return { signal: new AbortController().signal, onInteraction: vi.fn(), ...overrides };
}
