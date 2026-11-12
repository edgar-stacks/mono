import { type Mock, vi } from 'vitest';

import type {
  HardwareBitcoinSigner,
  HardwareStacksSigner,
  HardwareWalletAppInfo,
  HardwareWalletCapabilities,
  HardwareWalletConnector,
  HardwareWalletSession,
} from './hardware-wallet';
import type { OperationContext } from './operation-context';

type Mocked<T> = { [K in keyof T]: T[K] extends (...args: never[]) => unknown ? Mock<T[K]> : T[K] };

export type FakeHardwareBitcoinSigner = Mocked<HardwareBitcoinSigner>;

export type FakeHardwareStacksSigner = Mocked<HardwareStacksSigner>;

export type FakeHardwareWalletSession = Omit<HardwareWalletSession, 'close'> & {
  close: Mock<HardwareWalletSession['close']>;
};

export type FakeHardwareWalletConnector = Mocked<HardwareWalletConnector>;

const fakeCapabilities: HardwareWalletCapabilities = {
  chains: ['bitcoin', 'stacks'],
  bitcoinWalletPolicies: true,
};

export function makeFakeHardwareBitcoinSigner(
  overrides: Partial<FakeHardwareBitcoinSigner> = {}
): FakeHardwareBitcoinSigner {
  return {
    getMasterFingerprint: vi.fn<HardwareBitcoinSigner['getMasterFingerprint']>(),
    requestAccountKeys: vi.fn<HardwareBitcoinSigner['requestAccountKeys']>(),
    signPsbt: vi.fn<HardwareBitcoinSigner['signPsbt']>(),
    showAddress: vi.fn<HardwareBitcoinSigner['showAddress']>(),
    ...overrides,
  };
}

export function makeFakeHardwareStacksSigner(
  overrides: Partial<FakeHardwareStacksSigner> = {}
): FakeHardwareStacksSigner {
  return {
    getMasterFingerprint: vi.fn<HardwareStacksSigner['getMasterFingerprint']>(),
    requestAccountKeys: vi.fn<HardwareStacksSigner['requestAccountKeys']>(),
    signTransaction: vi.fn<HardwareStacksSigner['signTransaction']>(),
    signMessage: vi.fn<HardwareStacksSigner['signMessage']>(),
    signStructuredMessage: vi.fn<HardwareStacksSigner['signStructuredMessage']>(),
    showAddress: vi.fn<HardwareStacksSigner['showAddress']>(),
    ...overrides,
  };
}

interface MakeFakeHardwareWalletArgs {
  bitcoin?: HardwareBitcoinSigner | null;
  stacks?: HardwareStacksSigner | null;
  app?: HardwareWalletAppInfo | null;
}

export function makeFakeHardwareWallet({
  bitcoin = null,
  stacks = null,
  app = null,
}: MakeFakeHardwareWalletArgs = {}): FakeHardwareWalletSession {
  return {
    vendor: 'ledger',
    capabilities: fakeCapabilities,
    app,
    bitcoin,
    stacks,
    close: vi.fn<HardwareWalletSession['close']>().mockResolvedValue(undefined),
  };
}

export function makeFakeHardwareWalletConnector(
  session: HardwareWalletSession = makeFakeHardwareWallet()
): FakeHardwareWalletConnector {
  return {
    vendor: 'ledger',
    capabilities: fakeCapabilities,
    pair: vi
      .fn<HardwareWalletConnector['pair']>()
      .mockResolvedValue({ id: 'device-1', name: 'Fake hardware wallet' }),
    connect: vi.fn<HardwareWalletConnector['connect']>().mockResolvedValue(session),
  };
}

export function makeFakeOperationContext(
  overrides: Partial<OperationContext> = {}
): OperationContext {
  return { signal: new AbortController().signal, onInteraction: vi.fn(), ...overrides };
}
