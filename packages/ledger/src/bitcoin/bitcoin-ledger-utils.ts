import {
  DefaultDescriptorTemplate,
  DefaultWallet,
  type GetWalletAddressDAIntermediateValue,
} from '@ledgerhq/device-signer-kit-bitcoin';
import { type Psbt } from 'bitcoinjs-lib';

import {
  makeNativeSegwitAccountDerivationPath,
  makeTaprootAccountDerivationPath,
} from '@leather.io/bitcoin';
import type { BitcoinNetworkModes } from '@leather.io/models';

import type { LedgerDeviceActionOptions } from '../dmk/ledger-device-action';
import { LEDGER_APPS_MAP, type LedgerBitcoinApp } from '../ledger-app';
import {
  type PartialSignature,
  getWalletAddressOnDevice,
  toSignerKitDerivationPath,
} from './bitcoin-signer-kit-utils';

export function bitcoinAppNameForNetwork(network: BitcoinNetworkModes): string | null {
  if (network === 'mainnet') return LEDGER_APPS_MAP.BITCOIN_MAINNET;
  if (network === 'testnet') return LEDGER_APPS_MAP.BITCOIN_TESTNET;
  return null;
}

interface WalletPolicyDetails {
  fingerprint: string;
  network: BitcoinNetworkModes;
  xpub: string;
  accountIndex: number;
}

// Function that takes a derivation path generator fn and uses that to derive a
// wallet policy string from it
// E.g.[844b93a0/84'/0'/2']xpub6CQGqQ…gNfC21xp8r
function derivationPathToWalletPolicy(
  makePath: (network: BitcoinNetworkModes, accountIndex: number) => string
) {
  return ({ network, accountIndex, fingerprint, xpub }: WalletPolicyDetails) =>
    '[' + makePath(network, accountIndex).replace('m', fingerprint) + ']' + xpub;
}

export function createNativeSegwitWalletPolicyKey(policyDetails: WalletPolicyDetails) {
  return derivationPathToWalletPolicy(makeNativeSegwitAccountDerivationPath)(policyDetails);
}

export function createTaprootWalletPolicyKey(policyDetails: WalletPolicyDetails) {
  return derivationPathToWalletPolicy(makeTaprootAccountDerivationPath)(policyDetails);
}

export function makeNativeSegwitDefaultWallet(network: BitcoinNetworkModes, accountIndex: number) {
  return new DefaultWallet(
    toSignerKitDerivationPath(makeNativeSegwitAccountDerivationPath(network, accountIndex)),
    DefaultDescriptorTemplate.NATIVE_SEGWIT
  );
}

export function makeTaprootDefaultWallet(network: BitcoinNetworkModes, accountIndex: number) {
  return new DefaultWallet(
    toSignerKitDerivationPath(makeTaprootAccountDerivationPath(network, accountIndex)),
    DefaultDescriptorTemplate.TAPROOT
  );
}

const receiveAddressChangeIndex = 0;
const receiveAddressIndex = 0;

interface DisplayAddressOnDeviceArgs {
  network: BitcoinNetworkModes;
  accountIndex: number;
  changeIndex?: number;
  addressIndex?: number;
}

// Displays the account's receive address on the Ledger screen using the
// device's own xpub, so a wrong device produces a mismatch rather than a
// confirmation. Returns the address the device showed for the caller to assert
// against the locally derived one.
async function displayDefaultWalletAddress(
  app: LedgerBitcoinApp,
  {
    network,
    accountIndex,
    changeIndex = receiveAddressChangeIndex,
    addressIndex = receiveAddressIndex,
  }: DisplayAddressOnDeviceArgs,
  makeDefaultWallet: (network: BitcoinNetworkModes, accountIndex: number) => DefaultWallet,
  options?: LedgerDeviceActionOptions<GetWalletAddressDAIntermediateValue>
) {
  return getWalletAddressOnDevice(
    app,
    makeDefaultWallet(network, accountIndex),
    { changeIndex, addressIndex },
    options
  );
}

export function displayNativeSegwitAddressOnDevice(app: LedgerBitcoinApp) {
  return async (
    args: DisplayAddressOnDeviceArgs,
    options?: LedgerDeviceActionOptions<GetWalletAddressDAIntermediateValue>
  ) => displayDefaultWalletAddress(app, args, makeNativeSegwitDefaultWallet, options);
}

export function displayTaprootAddressOnDevice(app: LedgerBitcoinApp) {
  return async (
    args: DisplayAddressOnDeviceArgs,
    options?: LedgerDeviceActionOptions<GetWalletAddressDAIntermediateValue>
  ) => displayDefaultWalletAddress(app, args, makeTaprootDefaultWallet, options);
}

export function addNativeSegwitSignaturesToPsbt(psbt: Psbt, signatures: PartialSignature[]) {
  signatures.forEach(({ inputIndex, pubkey, signature }) =>
    psbt.updateInput(inputIndex, { partialSig: [{ pubkey, signature }] })
  );
}

export function addTaprootInputSignaturesToPsbt(psbt: Psbt, signatures: PartialSignature[]) {
  signatures.forEach(({ inputIndex, signature }) =>
    psbt.updateInput(inputIndex, { tapKeySig: signature })
  );
}

export function isBitcoinAppOpen(network: BitcoinNetworkModes, appName: string) {
  if (network === 'mainnet') return appName === LEDGER_APPS_MAP.BITCOIN_MAINNET;
  return appName === LEDGER_APPS_MAP.BITCOIN_TESTNET;
}
