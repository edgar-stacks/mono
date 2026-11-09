import { WalletPolicy } from '@ledgerhq/device-signer-kit-bitcoin';
import { bytesToHex } from '@noble/hashes/utils';
import * as btc from '@scure/btc-signer';
import { Psbt } from 'bitcoinjs-lib';
import { groupBy, values } from 'remeda';

import {
  ecdsaPublicKeyToSchnorr,
  getBitcoinJsLibNetworkConfigByMode,
  getInputPaymentType,
  makeNativeSegwitAccountDerivationPath,
  makeTaprootAccountDerivationPath,
} from '@leather.io/bitcoin';
import { extractAccountIndexFromPath } from '@leather.io/crypto';
import type { BitcoinNetworkModes } from '@leather.io/models';

import {
  type WalletPolicyDetails,
  addNativeSegwitSignaturesToPsbt,
  addTaprootInputSignaturesToPsbt,
  createNativeSegwitWalletPolicyKey,
  createTaprootWalletPolicyKey,
  displayNativeSegwitAddressOnDevice,
  displayTaprootAddressOnDevice,
  makeNativeSegwitDefaultWallet,
  makeTaprootDefaultWallet,
} from '../bitcoin/bitcoin-ledger-utils';
import {
  getExtendedPublicKey,
  getMasterFingerprintHex,
  getWalletAddressOnDevice,
  registerWalletPolicy,
  signPsbtWithWallet,
} from '../bitcoin/bitcoin-signer-kit-utils';
import { buildLedgerWalletPolicy } from '../bitcoin/ledger-wallet-policy';
import type {
  HardwareBitcoinAccountKey,
  HardwareBitcoinInputToSign,
  HardwareBitcoinPaymentType,
  HardwareBitcoinSigner,
  OperationContext,
} from '../contract/hardware-wallet';
import { throwIfAborted } from '../contract/hardware-wallet-error';
import type { LedgerBitcoinApp } from '../ledger-app';
import { withLedgerErrors } from './ledger-error-mapping';
import { makeRunLedgerDeviceAction } from './ledger-interaction';

interface PaymentTypeKeyFactory {
  paymentType: HardwareBitcoinPaymentType;
  makeDerivationPath(network: BitcoinNetworkModes, accountIndex: number): string;
  makePolicy(details: WalletPolicyDetails): string;
}

function getPaymentTypeKeyFactories(): PaymentTypeKeyFactory[] {
  return [
    {
      paymentType: 'p2wpkh',
      makeDerivationPath: makeNativeSegwitAccountDerivationPath,
      makePolicy: createNativeSegwitWalletPolicyKey,
    },
    {
      paymentType: 'p2tr',
      makeDerivationPath: makeTaprootAccountDerivationPath,
      makePolicy: createTaprootWalletPolicyKey,
    },
  ];
}

interface TypedInputToSign extends HardwareBitcoinInputToSign {
  paymentType: HardwareBitcoinPaymentType;
  accountIndex: number;
}

function hasPublicKey(entries: { pubkey: Uint8Array }[] | undefined, publicKey: Uint8Array) {
  const publicKeyHex = bytesToHex(publicKey);
  return entries?.some(entry => bytesToHex(entry.pubkey) === publicKeyHex) ?? false;
}

function addBip32Derivations(
  psbt: Psbt,
  fingerprint: string,
  inputsToSign: HardwareBitcoinInputToSign[]
) {
  inputsToSign.forEach(({ index, derivationPath, publicKey }) => {
    // Coordinator PSBTs routinely populate bip32_derivation for every policy
    // key. Re-adding our key would hit bip174's by-pubkey dedupe and throw
    // "Can not add duplicate data to array", so skip when it is already present.
    if (hasPublicKey(psbt.data.inputs[index]?.bip32Derivation, publicKey)) return;
    psbt.updateInput(index, {
      bip32Derivation: [
        {
          masterFingerprint: Buffer.from(fingerprint, 'hex'),
          pubkey: Buffer.from(publicKey),
          path: derivationPath,
        },
      ],
    });
  });
}

function addTapBip32Derivations(
  psbt: Psbt,
  fingerprint: string,
  inputsToSign: HardwareBitcoinInputToSign[]
) {
  inputsToSign.forEach(({ index, derivationPath, publicKey }) => {
    const xOnlyPublicKey = ecdsaPublicKeyToSchnorr(publicKey);
    if (hasPublicKey(psbt.data.inputs[index]?.tapBip32Derivation, xOnlyPublicKey)) return;
    psbt.updateInput(index, {
      tapBip32Derivation: [
        {
          masterFingerprint: Buffer.from(fingerprint, 'hex'),
          pubkey: Buffer.from(xOnlyPublicKey),
          path: derivationPath,
          leafHashes: [],
        },
      ],
    });
  });
}

function stripOwnPartialSigs(psbt: Psbt, inputsToSign: HardwareBitcoinInputToSign[]) {
  inputsToSign.forEach(({ index, publicKey }) => {
    const input = psbt.data.inputs[index];
    if (!input?.partialSig?.length) return;
    const publicKeyHex = bytesToHex(publicKey);
    const remaining = input.partialSig.filter(sig => bytesToHex(sig.pubkey) !== publicKeyHex);
    if (remaining.length === input.partialSig.length) return;
    if (remaining.length) input.partialSig = remaining;
    else delete input.partialSig;
  });
}

function toTypedInputsToSign(
  psbt: Psbt,
  inputsToSign: HardwareBitcoinInputToSign[]
): TypedInputToSign[] {
  const tx = btc.Transaction.fromPSBT(psbt.toBuffer());
  const typedInputs: TypedInputToSign[] = [];
  for (const inputToSign of inputsToSign) {
    const paymentType = getInputPaymentType(tx.getInput(inputToSign.index));
    if (paymentType !== 'p2wpkh' && paymentType !== 'p2tr') continue;
    const accountIndex = extractAccountIndexFromPath(inputToSign.derivationPath);
    typedInputs.push({ ...inputToSign, paymentType, accountIndex });
  }
  return typedInputs;
}

interface SignDefaultWalletInputsArgs {
  fingerprint: string;
  network: BitcoinNetworkModes;
  inputsToSign: HardwareBitcoinInputToSign[];
}
async function signDefaultWalletInputs(
  app: LedgerBitcoinApp,
  psbt: Psbt,
  { fingerprint, network, inputsToSign }: SignDefaultWalletInputsArgs
) {
  const typedInputs = toTypedInputsToSign(psbt, inputsToSign);

  //
  // Taproot
  const taprootGroups = values(
    groupBy(
      typedInputs.filter(input => input.paymentType === 'p2tr'),
      input => input.accountIndex
    )
  );
  for (const group of taprootGroups) {
    addTapBip32Derivations(psbt, fingerprint, group);
    const signatures = await signPsbtWithWallet(
      app,
      makeTaprootDefaultWallet(network, group[0].accountIndex),
      psbt.toBase64()
    );
    addTaprootInputSignaturesToPsbt(psbt, signatures);
  }

  //
  // Native Segwit
  const nativeSegwitGroups = values(
    groupBy(
      typedInputs.filter(input => input.paymentType === 'p2wpkh'),
      input => input.accountIndex
    )
  );
  for (const group of nativeSegwitGroups) {
    addBip32Derivations(psbt, fingerprint, group);
    const signatures = await signPsbtWithWallet(
      app,
      makeNativeSegwitDefaultWallet(network, group[0].accountIndex),
      psbt.toBase64()
    );
    addNativeSegwitSignaturesToPsbt(psbt, signatures);
  }
}

interface SignPolicyInputsArgs {
  fingerprint: string;
  policyDescriptor: string;
  inputsToSign: HardwareBitcoinInputToSign[];
}
async function signPolicyInputs(
  app: LedgerBitcoinApp,
  psbt: Psbt,
  { fingerprint, policyDescriptor, inputsToSign }: SignPolicyInputsArgs
) {
  addBip32Derivations(psbt, fingerprint, inputsToSign);
  // A coordinator PSBT may already carry a partialSig for the account key; the
  // device adding its own would collide on bip174's by-pubkey dedupe. Strip ours
  // (co-signer signatures stay) so signLedger can merge the fresh signature.
  stripOwnPartialSigs(psbt, inputsToSign);
  const registeredWallet = await registerLedgerWalletPolicy(app, policyDescriptor, fingerprint);
  const signatures = await signPsbtWithWallet(app, registeredWallet, psbt.toBase64());
  addNativeSegwitSignaturesToPsbt(psbt, signatures);
}

function registerLedgerWalletPolicy(
  app: LedgerBitcoinApp,
  policyDescriptor: string,
  fingerprint: string
) {
  const policy = buildLedgerWalletPolicy(policyDescriptor, fingerprint);
  return registerWalletPolicy(
    app,
    new WalletPolicy(policy.name, policy.descriptorTemplate, policy.keys)
  );
}

export function createLedgerBitcoinSigner(app: LedgerBitcoinApp): HardwareBitcoinSigner {
  function withContext(ctx: OperationContext): LedgerBitcoinApp {
    return { ...app, runAction: makeRunLedgerDeviceAction(ctx, null) };
  }

  return {
    getMasterFingerprint: withLedgerErrors(async ctx => getMasterFingerprintHex(withContext(ctx))),

    requestAccountKeys: withLedgerErrors(async ({ network, accountCount, onRequestKey }, ctx) => {
      const contextApp = withContext(ctx);
      const fingerprint = await getMasterFingerprintHex(contextApp);
      const keys: HardwareBitcoinAccountKey[] = [];
      for (const { paymentType, makeDerivationPath, makePolicy } of getPaymentTypeKeyFactories()) {
        for (let accountIndex = 0; accountIndex < accountCount; accountIndex++) {
          throwIfAborted(ctx.signal);
          onRequestKey?.({ paymentType, accountIndex });
          const derivationPath = makeDerivationPath(network, accountIndex);
          const xpub = await getExtendedPublicKey(contextApp, derivationPath);
          const policy = makePolicy({ network, accountIndex, fingerprint, xpub });
          keys.push({ paymentType, accountIndex, derivationPath, xpub, policy });
        }
      }
      return { fingerprint, keys };
    }),

    signPsbt: withLedgerErrors(
      async ({ psbt: rawPsbt, network, inputsToSign, policyDescriptor }, ctx) => {
        const contextApp = withContext(ctx);
        const fingerprint = await getMasterFingerprintHex(contextApp);
        const psbt = Psbt.fromBuffer(Buffer.from(rawPsbt), {
          network: getBitcoinJsLibNetworkConfigByMode(network),
        });
        if (policyDescriptor) {
          await signPolicyInputs(contextApp, psbt, { fingerprint, policyDescriptor, inputsToSign });
        } else {
          await signDefaultWalletInputs(contextApp, psbt, { fingerprint, network, inputsToSign });
        }
        return new Uint8Array(psbt.toBuffer());
      }
    ),

    showAddress: withLedgerErrors(async (args, ctx) => {
      const contextApp = withContext(ctx);
      if (args.kind === 'policy') {
        const fingerprint = await getMasterFingerprintHex(contextApp);
        const registeredWallet = await registerLedgerWalletPolicy(
          contextApp,
          args.policyDescriptor,
          fingerprint
        );
        return getWalletAddressOnDevice(contextApp, registeredWallet, {
          changeIndex: args.changeIndex,
          addressIndex: args.addressIndex,
        });
      }
      const displayArgs = { network: args.network, accountIndex: args.accountIndex };
      if (args.paymentType === 'p2tr')
        return displayTaprootAddressOnDevice(contextApp)(displayArgs);
      return displayNativeSegwitAddressOnDevice(contextApp)(displayArgs);
    }),
  };
}
