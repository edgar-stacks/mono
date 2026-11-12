import type { ClarityValue, StacksTransactionWire } from '@stacks/transactions';

import type { BitcoinNetworkModes } from '@leather.io/models';
import type { SignatureData, StacksDerivationPathType } from '@leather.io/stacks';

import type { OperationContext } from './operation-context';

export type HardwareWalletVendor = 'ledger';

export type HardwareWalletChain = 'bitcoin' | 'stacks';

export interface HardwareWalletCapabilities {
  chains: readonly HardwareWalletChain[];
  bitcoinWalletPolicies: boolean;
}

export interface DiscoveredHardwareDevice {
  id: string;
  name: string;
}

export interface HardwareWalletAppInfo {
  name: string;
  version: string;
}

export type ConnectRequest =
  | { chain: 'bitcoin'; network: BitcoinNetworkModes }
  | { chain: 'stacks' };

export type BitcoinKeyStandard = 'p2wpkh' | 'p2tr';

export interface RequestBitcoinAccountKeysArgs {
  network: BitcoinNetworkModes;
  accountIndexes: readonly number[];
  onRequestKey?(key: { standard: BitcoinKeyStandard; accountIndex: number }): void;
}

export interface HardwareBitcoinAccountKey {
  standard: BitcoinKeyStandard;
  accountIndex: number;
  path: string;
  xpub: string;
  policy: string;
}

export interface HardwareBitcoinAccountKeys {
  fingerprint: string;
  keys: HardwareBitcoinAccountKey[];
}

export interface BitcoinInputToSign {
  index: number;
  derivationPath: string;
  publicKey: Uint8Array;
}

export interface SignBitcoinPsbtArgs {
  psbt: Uint8Array;
  network: BitcoinNetworkModes;
  inputsToSign: readonly BitcoinInputToSign[];
  policyDescriptor?: string;
}

export type ShowBitcoinAddressArgs =
  | {
      type: 'default';
      network: BitcoinNetworkModes;
      standard: BitcoinKeyStandard;
      accountIndex: number;
    }
  | { type: 'policy'; network: BitcoinNetworkModes; policyDescriptor: string };

export interface HardwareBitcoinSigner {
  getMasterFingerprint(ctx: OperationContext): Promise<string>;
  requestAccountKeys(
    args: RequestBitcoinAccountKeysArgs,
    ctx: OperationContext
  ): Promise<HardwareBitcoinAccountKeys>;
  signPsbt(args: SignBitcoinPsbtArgs, ctx: OperationContext): Promise<Uint8Array>;
  showAddress(args: ShowBitcoinAddressArgs, ctx: OperationContext): Promise<string>;
}

export interface RequestStacksAccountKeysArgs {
  derivationPathType: StacksDerivationPathType;
  accountIndexes: readonly number[];
  onRequestKey?(accountIndex: number): void;
}

export interface HardwareStacksAccountKey {
  path: string;
  stxPublicKey: string;
  dataPublicKey: string;
}

export interface HardwareStacksAccountKeys {
  fingerprint: string;
  keys: HardwareStacksAccountKey[];
}

export interface HardwareStacksKey {
  derivationPath: string;
  publicKey: string;
}

export interface SignStacksTransactionArgs {
  transaction: StacksTransactionWire;
  derivationPath: string;
}

export interface SignStacksMessageArgs extends HardwareStacksKey {
  message: string;
}

export interface SignStacksStructuredMessageArgs extends HardwareStacksKey {
  domain: ClarityValue;
  message: ClarityValue;
}

export interface ShowStacksAddressArgs {
  derivationPath: string;
  chainId: number;
}

export interface HardwareStacksSigner {
  getMasterFingerprint(ctx: OperationContext): Promise<string>;
  requestAccountKeys(
    args: RequestStacksAccountKeysArgs,
    ctx: OperationContext
  ): Promise<HardwareStacksAccountKeys>;
  signTransaction(
    args: SignStacksTransactionArgs,
    ctx: OperationContext
  ): Promise<StacksTransactionWire>;
  signMessage(args: SignStacksMessageArgs, ctx: OperationContext): Promise<SignatureData>;
  signStructuredMessage(
    args: SignStacksStructuredMessageArgs,
    ctx: OperationContext
  ): Promise<SignatureData>;
  showAddress(args: ShowStacksAddressArgs, ctx: OperationContext): Promise<string>;
}

export interface HardwareWallet {
  vendor: HardwareWalletVendor;
  capabilities: HardwareWalletCapabilities;
  app: HardwareWalletAppInfo | null;
  bitcoin: HardwareBitcoinSigner | null;
  stacks: HardwareStacksSigner | null;
}

export interface HardwareWalletSession extends HardwareWallet {
  close(): Promise<void>;
}

export interface HardwareWalletConnector {
  vendor: HardwareWalletVendor;
  capabilities: HardwareWalletCapabilities;
  pair(ctx: OperationContext): Promise<DiscoveredHardwareDevice>;
  connect(request: ConnectRequest, ctx: OperationContext): Promise<HardwareWalletSession>;
}
