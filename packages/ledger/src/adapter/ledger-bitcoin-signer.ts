import { WalletPolicy } from '@ledgerhq/device-signer-kit-bitcoin';
import { bytesToHex } from '@noble/hashes/utils';
import { Psbt } from 'bitcoinjs-lib';

import {
  ecdsaPublicKeyToSchnorr,
  getBitcoinJsLibNetworkConfigByMode,
  inferPaymentTypeFromPath,
  makeNativeSegwitAccountDerivationPath,
  makeTaprootAccountDerivationPath,
} from '@leather.io/bitcoin';
import { extractAccountIndexFromPath } from '@leather.io/crypto';
import type { BitcoinNetworkModes } from '@leather.io/models';

import {
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
  SignBitcoinPsbtArgs,
} from '../contract/hardware-wallet';
import { HardwareWalletError, throwIfOperationAborted } from '../contract/hardware-wallet-error';
import type { LedgerBitcoinApp } from '../ledger-app';
import { withLedgerErrors } from './ledger-error';
import { toLedgerDeviceActionOptions } from './ledger-interaction';

const paymentTypeAccountKeys = [
  {
    paymentType: 'p2wpkh',
    makePath: makeNativeSegwitAccountDerivationPath,
    makeDescriptor: createNativeSegwitWalletPolicyKey,
  },
  {
    paymentType: 'p2tr',
    makePath: makeTaprootAccountDerivationPath,
    makeDescriptor: createTaprootWalletPolicyKey,
  },
] as const;

const defaultWalletSigningOrder: readonly HardwareBitcoinPaymentType[] = ['p2tr', 'p2wpkh'];

interface DefaultWalletInputGroup {
  paymentType: HardwareBitcoinPaymentType;
  accountIndex: number;
}

function toDefaultWalletPaymentType(derivationPath: string): HardwareBitcoinPaymentType {
  const paymentType = inferPaymentTypeFromPath(derivationPath);
  if (paymentType === 'p2wpkh' || paymentType === 'p2tr') return paymentType;
  throw new HardwareWalletError(
    'unsupported',
    `Cannot sign ${paymentType} inputs with a hardware wallet`
  );
}

function groupInputsByDefaultWallet(inputsToSign: HardwareBitcoinInputToSign[]) {
  const groups = new Map<string, DefaultWalletInputGroup>();
  inputsToSign.forEach(({ derivationPath }) => {
    const paymentType = toDefaultWalletPaymentType(derivationPath);
    const accountIndex = extractAccountIndexFromPath(derivationPath);
    groups.set(`${paymentType}/${accountIndex}`, { paymentType, accountIndex });
  });
  return [...groups.values()].sort(
    (a, b) =>
      defaultWalletSigningOrder.indexOf(a.paymentType) -
      defaultWalletSigningOrder.indexOf(b.paymentType)
  );
}

function hasDerivationForPubkey(entries: { pubkey: Uint8Array }[] | undefined, pubkey: Uint8Array) {
  const pubkeyHex = bytesToHex(pubkey);
  return entries?.some(entry => bytesToHex(entry.pubkey) === pubkeyHex) ?? false;
}

function addInputDerivations(
  psbt: Psbt,
  fingerprint: string,
  inputsToSign: HardwareBitcoinInputToSign[]
) {
  const masterFingerprint = Buffer.from(fingerprint, 'hex');
  inputsToSign.forEach(({ index, derivationPath, publicKey }) => {
    const input = psbt.data.inputs[index];
    if (!input) throw new HardwareWalletError('invalid-payload', `PSBT has no input ${index}`);

    if (inferPaymentTypeFromPath(derivationPath) === 'p2tr') {
      const pubkey = Buffer.from(ecdsaPublicKeyToSchnorr(publicKey));
      if (hasDerivationForPubkey(input.tapBip32Derivation, pubkey)) return;
      psbt.updateInput(index, {
        tapBip32Derivation: [{ masterFingerprint, pubkey, path: derivationPath, leafHashes: [] }],
      });
      return;
    }

    // Coordinator PSBTs routinely populate bip32_derivation for every policy
    // key. Re-adding our key would hit bip174's by-pubkey dedupe and throw
    // "Can not add duplicate data to array", so skip when it is already present.
    const pubkey = Buffer.from(publicKey);
    if (hasDerivationForPubkey(input.bip32Derivation, pubkey)) return;
    psbt.updateInput(index, {
      bip32Derivation: [{ masterFingerprint, pubkey, path: derivationPath }],
    });
  });
}

// A coordinator PSBT may already carry a partialSig for the account key; the
// device adding its own would collide on bip174's by-pubkey dedupe. Strip ours
// (co-signer signatures stay) so signLedger can merge the fresh signature.
function stripAccountPartialSigs(psbt: Psbt, inputsToSign: HardwareBitcoinInputToSign[]) {
  inputsToSign.forEach(({ index, publicKey }) => {
    const input = psbt.data.inputs[index];
    if (!input?.partialSig?.length) return;
    const accountPubkeyHex = bytesToHex(publicKey);
    const remaining = input.partialSig.filter(sig => bytesToHex(sig.pubkey) !== accountPubkeyHex);
    if (remaining.length === input.partialSig.length) return;
    if (remaining.length) input.partialSig = remaining;
    else delete input.partialSig;
  });
}

async function signWithDefaultWallets(
  app: LedgerBitcoinApp,
  psbt: Psbt,
  network: BitcoinNetworkModes,
  inputsToSign: HardwareBitcoinInputToSign[],
  ctx: OperationContext
) {
  for (const { paymentType, accountIndex } of groupInputsByDefaultWallet(inputsToSign)) {
    throwIfOperationAborted(ctx.signal);
    if (paymentType === 'p2tr') {
      const signatures = await signPsbtWithWallet(
        app,
        makeTaprootDefaultWallet(network, accountIndex),
        psbt.toBase64(),
        toLedgerDeviceActionOptions(ctx)
      );
      addTaprootInputSignaturesToPsbt(psbt, signatures);
    } else {
      const signatures = await signPsbtWithWallet(
        app,
        makeNativeSegwitDefaultWallet(network, accountIndex),
        psbt.toBase64(),
        toLedgerDeviceActionOptions(ctx)
      );
      addNativeSegwitSignaturesToPsbt(psbt, signatures);
    }
  }
}

async function registerLedgerWalletPolicy(
  app: LedgerBitcoinApp,
  policyDescriptor: string,
  fingerprint: string,
  ctx: OperationContext
) {
  const policy = buildLedgerWalletPolicy(policyDescriptor, fingerprint);
  return registerWalletPolicy(
    app,
    new WalletPolicy(policy.name, policy.descriptorTemplate, policy.keys),
    toLedgerDeviceActionOptions(ctx)
  );
}

async function signWithWalletPolicy(
  app: LedgerBitcoinApp,
  psbt: Psbt,
  policyDescriptor: string,
  fingerprint: string,
  inputsToSign: HardwareBitcoinInputToSign[],
  ctx: OperationContext
) {
  stripAccountPartialSigs(psbt, inputsToSign);
  const registeredWallet = await registerLedgerWalletPolicy(
    app,
    policyDescriptor,
    fingerprint,
    ctx
  );
  ctx.onInteraction?.({ type: 'confirm-on-device' });
  const signatures = await signPsbtWithWallet(
    app,
    registeredWallet,
    psbt.toBase64(),
    toLedgerDeviceActionOptions(ctx)
  );
  addNativeSegwitSignaturesToPsbt(psbt, signatures);
}

async function signPsbt(
  app: LedgerBitcoinApp,
  { psbt: rawPsbt, network, inputsToSign, policyDescriptor }: SignBitcoinPsbtArgs,
  ctx: OperationContext
): Promise<Uint8Array> {
  const fingerprint = await getMasterFingerprintHex(app, toLedgerDeviceActionOptions(ctx));
  const psbt = Psbt.fromBuffer(Buffer.from(rawPsbt), {
    network: getBitcoinJsLibNetworkConfigByMode(network),
  });
  addInputDerivations(psbt, fingerprint, inputsToSign);

  if (policyDescriptor)
    await signWithWalletPolicy(app, psbt, policyDescriptor, fingerprint, inputsToSign, ctx);
  else await signWithDefaultWallets(app, psbt, network, inputsToSign, ctx);

  return psbt.toBuffer();
}

export function createLedgerBitcoinSigner(app: LedgerBitcoinApp): HardwareBitcoinSigner {
  return {
    getMasterFingerprint(ctx) {
      return withLedgerErrors(() => getMasterFingerprintHex(app, toLedgerDeviceActionOptions(ctx)));
    },
    requestAccountKeys({ network, count, onRequestKey }, ctx) {
      return withLedgerErrors(async () => {
        const fingerprint = await getMasterFingerprintHex(app, toLedgerDeviceActionOptions(ctx));
        const keys: HardwareBitcoinAccountKey[] = [];
        for (const { paymentType, makePath, makeDescriptor } of paymentTypeAccountKeys) {
          for (let accountIndex = 0; accountIndex < count; accountIndex++) {
            throwIfOperationAborted(ctx.signal);
            onRequestKey?.({ paymentType, accountIndex });
            const path = makePath(network, accountIndex);
            const xpub = await getExtendedPublicKey(app, path, toLedgerDeviceActionOptions(ctx));
            const descriptor = makeDescriptor({ xpub, fingerprint, network, accountIndex });
            keys.push({ paymentType, accountIndex, path, xpub, descriptor });
          }
        }
        return { fingerprint, keys };
      });
    },
    signPsbt(args, ctx) {
      return withLedgerErrors(() => signPsbt(app, args, ctx));
    },
    showAddress(args, ctx) {
      return withLedgerErrors(async () => {
        if (args.kind === 'default') {
          const { paymentType, network, accountIndex, changeIndex, addressIndex } = args;
          const displayAddress =
            paymentType === 'p2tr'
              ? displayTaprootAddressOnDevice(app)
              : displayNativeSegwitAddressOnDevice(app);
          return displayAddress(
            { network, accountIndex, changeIndex, addressIndex },
            toLedgerDeviceActionOptions(ctx)
          );
        }
        const { policyDescriptor, changeIndex, addressIndex } = args;
        const fingerprint = await getMasterFingerprintHex(app, toLedgerDeviceActionOptions(ctx));
        const registeredWallet = await registerLedgerWalletPolicy(
          app,
          policyDescriptor,
          fingerprint,
          ctx
        );
        ctx.onInteraction?.({ type: 'verify-address' });
        return getWalletAddressOnDevice(
          app,
          registeredWallet,
          { changeIndex, addressIndex },
          toLedgerDeviceActionOptions(ctx)
        );
      });
    },
  };
}
