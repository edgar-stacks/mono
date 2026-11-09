import type { ClarityValue, StacksTransactionWire } from '@stacks/transactions';

import type { BitcoinNetworkModes } from '@leather.io/models';
import type { SignatureData, StacksDerivationPathType } from '@leather.io/stacks';

export type HardwareWalletVendor = 'ledger';

export interface HardwareWalletCapabilities {
  bitcoin: boolean;
  stacks: boolean;
  bitcoinWalletPolicies: boolean;
}

export type HardwareWalletInteraction =
  | { type: 'none' }
  | { type: 'unlock-device' }
  | { type: 'open-app'; appName: string | null }
  | { type: 'confirm-on-device' }
  | { type: 'approve-policy' }
  | { type: 'verify-address' }
  | { type: 'show-qr'; payload: string }
  | { type: 'scan-qr' };

export interface OperationContext {
  signal?: AbortSignal;
  onInteraction?(interaction: HardwareWalletInteraction): void;
}

export interface DiscoveredHardwareDevice {
  id: string;
  name: string;
}

export type ConnectRequest =
  | { chain: 'bitcoin'; network: BitcoinNetworkModes }
  | { chain: 'stacks' };

export type HardwareBitcoinPaymentType = 'p2wpkh' | 'p2tr';

export interface RequestBitcoinAccountKeysArgs {
  network: BitcoinNetworkModes;
  count: number;
  onRequestKey?(key: { paymentType: HardwareBitcoinPaymentType; accountIndex: number }): void;
}

export interface HardwareBitcoinAccountKey {
  paymentType: HardwareBitcoinPaymentType;
  accountIndex: number;
  path: string;
  xpub: string;
  descriptor: string;
}

export interface HardwareBitcoinAccountKeys {
  fingerprint: string;
  keys: HardwareBitcoinAccountKey[];
}

export interface HardwareBitcoinInputToSign {
  index: number;
  derivationPath: string;
  publicKey: Uint8Array;
}

export interface SignBitcoinPsbtArgs {
  psbt: Uint8Array;
  network: BitcoinNetworkModes;
  inputsToSign: HardwareBitcoinInputToSign[];
  policyDescriptor?: string;
}

interface AddressIndexes {
  changeIndex: number;
  addressIndex: number;
}

interface ShowDefaultBitcoinAddressArgs extends AddressIndexes {
  kind: 'default';
  paymentType: HardwareBitcoinPaymentType;
  network: BitcoinNetworkModes;
  accountIndex: number;
}

interface ShowPolicyBitcoinAddressArgs extends AddressIndexes {
  kind: 'policy';
  policyDescriptor: string;
}

export type ShowBitcoinAddressArgs = ShowDefaultBitcoinAddressArgs | ShowPolicyBitcoinAddressArgs;

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
  count: number;
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

export interface GetStacksPublicKeyArgs {
  derivationPath: string;
}

export interface SignStacksTransactionArgs {
  transaction: StacksTransactionWire;
  derivationPath: string;
}

export interface SignStacksMessageArgs {
  message: string;
  derivationPath: string;
  publicKey: string;
}

export interface SignStacksStructuredMessageArgs {
  domain: ClarityValue;
  message: ClarityValue;
  derivationPath: string;
  publicKey: string;
}

export interface ShowStacksAddressArgs {
  derivationPath: string;
  chainId: number;
}

export interface HardwareStacksSigner {
  getMasterFingerprint(ctx: OperationContext): Promise<string>;
  getPublicKey(args: GetStacksPublicKeyArgs, ctx: OperationContext): Promise<string>;
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

export interface HardwareWalletApp {
  name: string;
  version: string;
}

export interface HardwareWallet {
  vendor: HardwareWalletVendor;
  capabilities: HardwareWalletCapabilities;
  app: HardwareWalletApp | null;
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
