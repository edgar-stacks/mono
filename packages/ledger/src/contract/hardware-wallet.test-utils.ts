import { vi } from 'vitest';

import type {
  HardwareBitcoinSigner,
  HardwareStacksSigner,
  HardwareWallet,
  HardwareWalletCapabilities,
  HardwareWalletConnector,
  HardwareWalletSession,
} from './hardware-wallet';

export const fakeHardwareWalletCapabilities: HardwareWalletCapabilities = {
  bitcoin: true,
  stacks: true,
  bitcoinWalletPolicies: true,
};

export function makeFakeHardwareBitcoinSigner(
  overrides: Partial<HardwareBitcoinSigner> = {}
): HardwareBitcoinSigner {
  return {
    getMasterFingerprint: vi.fn().mockResolvedValue('deadbeef'),
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
    getMasterFingerprint: vi.fn().mockResolvedValue('deadbeef'),
    getPublicKey: vi.fn(),
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
  return { ...wallet, close: vi.fn().mockResolvedValue(undefined) };
}

export function makeFakeHardwareWalletConnector(
  overrides: Partial<HardwareWalletConnector> = {}
): HardwareWalletConnector {
  return {
    vendor: 'ledger',
    capabilities: fakeHardwareWalletCapabilities,
    pair: vi.fn().mockResolvedValue({ id: 'fake-device', name: 'Fake device' }),
    connect: vi.fn().mockResolvedValue(makeFakeHardwareWalletSession()),
    ...overrides,
  };
}
