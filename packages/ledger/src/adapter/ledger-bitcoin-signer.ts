import { WalletPolicy } from '@ledgerhq/device-signer-kit-bitcoin';
import { bytesToHex } from '@noble/hashes/utils';
import { Psbt } from 'bitcoinjs-lib';
import { groupBy, pipe, values } from 'remeda';

import {
  compileWshDescriptor,
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
  BitcoinInputToSign,
  BitcoinKeyStandard,
  HardwareBitcoinAccountKey,
  HardwareBitcoinAccountKeys,
  HardwareBitcoinSigner,
  RequestBitcoinAccountKeysArgs,
  ShowBitcoinAddressArgs,
  SignBitcoinPsbtArgs,
} from '../contract/hardware-wallet';
import { HardwareWalletError } from '../contract/hardware-wallet-error';
import type { OperationContext } from '../contract/operation-context';
import type { LedgerBitcoinApp } from '../ledger-app';
import { makeLedgerActionRunner } from './ledger-action-runner';
import { withLedgerErrors } from './ledger-error-mapping';

const keyStandards: readonly BitcoinKeyStandard[] = ['p2wpkh', 'p2tr'];

const signingOrder: readonly BitcoinKeyStandard[] = ['p2tr', 'p2wpkh'];

const receiveAddressIndexes = { changeIndex: 0, addressIndex: 0 };

const keyStandardHelpers = {
  p2wpkh: {
    makeAccountPath: makeNativeSegwitAccountDerivationPath,
    makePolicyKey: createNativeSegwitWalletPolicyKey,
    makeDefaultWallet: makeNativeSegwitDefaultWallet,
  },
  p2tr: {
    makeAccountPath: makeTaprootAccountDerivationPath,
    makePolicyKey: createTaprootWalletPolicyKey,
    makeDefaultWallet: makeTaprootDefaultWallet,
  },
} as const;

type LedgerBitcoinSession = Omit<LedgerBitcoinApp, 'runAction'>;

function toKeyStandard(derivationPath: string): BitcoinKeyStandard {
  const paymentType = inferPaymentTypeFromPath(derivationPath);
  if (paymentType === 'p2wpkh' || paymentType === 'p2tr') return paymentType;
  throw new HardwareWalletError(
    'unsupported',
    `Unable to sign an input derived from ${derivationPath} with a default wallet`
  );
}

function hasDerivationForPublicKey(
  derivations: readonly { pubkey: Uint8Array }[] | undefined,
  publicKey: Uint8Array
) {
  const publicKeyHex = bytesToHex(publicKey);
  return derivations?.some(entry => bytesToHex(entry.pubkey) === publicKeyHex) ?? false;
}

function addInputDerivations(
  psbt: Psbt,
  fingerprint: string,
  inputsToSign: readonly BitcoinInputToSign[]
) {
  const masterFingerprint = Buffer.from(fingerprint, 'hex');
  inputsToSign.forEach(({ index, derivationPath, publicKey }) => {
    const input = psbt.data.inputs[index];
    if (!input) throw new HardwareWalletError('invalid-payload', `PSBT has no input ${index}`);

    if (toKeyStandard(derivationPath) === 'p2tr') {
      const pubkey = Buffer.from(ecdsaPublicKeyToSchnorr(publicKey));
      if (hasDerivationForPublicKey(input.tapBip32Derivation, pubkey)) return;
      psbt.updateInput(index, {
        tapBip32Derivation: [{ masterFingerprint, pubkey, path: derivationPath, leafHashes: [] }],
      });
      return;
    }

    if (hasDerivationForPublicKey(input.bip32Derivation, publicKey)) return;
    psbt.updateInput(index, {
      bip32Derivation: [
        { masterFingerprint, pubkey: Buffer.from(publicKey), path: derivationPath },
      ],
    });
  });
}

function stripStalePartialSignatures(psbt: Psbt, inputsToSign: readonly BitcoinInputToSign[]) {
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

async function registerPolicy(
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

async function requestAccountKeys(
  app: LedgerBitcoinApp,
  { network, accountIndexes, onRequestKey }: RequestBitcoinAccountKeysArgs
): Promise<HardwareBitcoinAccountKeys> {
  const fingerprint = await getMasterFingerprintHex(app);
  const keys: HardwareBitcoinAccountKey[] = [];
  for (const standard of keyStandards) {
    const { makeAccountPath, makePolicyKey } = keyStandardHelpers[standard];
    for (const accountIndex of accountIndexes) {
      onRequestKey?.({ standard, accountIndex });
      const path = makeAccountPath(network, accountIndex);
      const xpub = await getExtendedPublicKey(app, path);
      const policy = makePolicyKey({ xpub, fingerprint, network, accountIndex });
      keys.push({ standard, accountIndex, path, xpub, policy });
    }
  }
  return { fingerprint, keys };
}

interface DefaultWalletInputGroup {
  standard: BitcoinKeyStandard;
  accountIndex: number;
}

function groupDefaultWalletInputs(
  inputsToSign: readonly BitcoinInputToSign[]
): DefaultWalletInputGroup[] {
  const groups = pipe(
    [...inputsToSign],
    groupBy(
      ({ derivationPath }) =>
        `${toKeyStandard(derivationPath)}/${extractAccountIndexFromPath(derivationPath)}`
    ),
    values()
  ).map(([{ derivationPath }]) => ({
    standard: toKeyStandard(derivationPath),
    accountIndex: extractAccountIndexFromPath(derivationPath),
  }));
  return signingOrder.flatMap(standard => groups.filter(group => group.standard === standard));
}

async function signWithDefaultWallets(
  app: LedgerBitcoinApp,
  psbt: Psbt,
  network: BitcoinNetworkModes,
  inputsToSign: readonly BitcoinInputToSign[],
  ctx: OperationContext
) {
  for (const { standard, accountIndex } of groupDefaultWalletInputs(inputsToSign)) {
    const wallet = keyStandardHelpers[standard].makeDefaultWallet(network, accountIndex);
    ctx.onInteraction?.({ type: 'confirm-on-device' });
    const signatures = await signPsbtWithWallet(app, wallet, psbt.toBase64());
    if (standard === 'p2tr') addTaprootInputSignaturesToPsbt(psbt, signatures);
    else addNativeSegwitSignaturesToPsbt(psbt, signatures);
  }
}

interface SignWithPolicyArgs {
  psbt: Psbt;
  policyDescriptor: string;
  fingerprint: string;
  inputsToSign: readonly BitcoinInputToSign[];
}

async function signWithPolicy(
  app: LedgerBitcoinApp,
  { psbt, policyDescriptor, fingerprint, inputsToSign }: SignWithPolicyArgs,
  ctx: OperationContext
) {
  stripStalePartialSignatures(psbt, inputsToSign);
  const registeredWallet = await registerPolicy(app, policyDescriptor, fingerprint);
  ctx.onInteraction?.({ type: 'confirm-on-device' });
  const signatures = await signPsbtWithWallet(app, registeredWallet, psbt.toBase64());
  addNativeSegwitSignaturesToPsbt(psbt, signatures);
}

async function signPsbt(
  app: LedgerBitcoinApp,
  { psbt: rawPsbt, network, inputsToSign, policyDescriptor }: SignBitcoinPsbtArgs,
  ctx: OperationContext
): Promise<Uint8Array> {
  const psbt = Psbt.fromBuffer(Buffer.from(rawPsbt), {
    network: getBitcoinJsLibNetworkConfigByMode(network),
  });
  const fingerprint = await getMasterFingerprintHex(app);
  addInputDerivations(psbt, fingerprint, inputsToSign);

  if (policyDescriptor)
    await signWithPolicy(app, { psbt, policyDescriptor, fingerprint, inputsToSign }, ctx);
  else await signWithDefaultWallets(app, psbt, network, inputsToSign, ctx);

  return new Uint8Array(psbt.toBuffer());
}

async function showAddress(
  app: LedgerBitcoinApp,
  args: ShowBitcoinAddressArgs,
  ctx: OperationContext
): Promise<string> {
  if (args.type === 'default') {
    const wallet = keyStandardHelpers[args.standard].makeDefaultWallet(
      args.network,
      args.accountIndex
    );
    ctx.onInteraction?.({ type: 'verify-address' });
    return getWalletAddressOnDevice(app, wallet, receiveAddressIndexes);
  }

  const { keyPathIndexes } = compileWshDescriptor(args.policyDescriptor);
  const fingerprint = await getMasterFingerprintHex(app);
  const registeredWallet = await registerPolicy(app, args.policyDescriptor, fingerprint);
  ctx.onInteraction?.({ type: 'verify-address' });
  return getWalletAddressOnDevice(app, registeredWallet, keyPathIndexes);
}

export function createLedgerBitcoinSigner(
  session: LedgerBitcoinSession,
  appName: string | null
): HardwareBitcoinSigner {
  function appInContext(ctx: OperationContext): LedgerBitcoinApp {
    return { ...session, runAction: makeLedgerActionRunner(ctx, appName) };
  }

  return {
    getMasterFingerprint(ctx) {
      return withLedgerErrors(() => getMasterFingerprintHex(appInContext(ctx)));
    },
    requestAccountKeys(args, ctx) {
      return withLedgerErrors(() => requestAccountKeys(appInContext(ctx), args));
    },
    signPsbt(args, ctx) {
      return withLedgerErrors(() => signPsbt(appInContext(ctx), args, ctx));
    },
    showAddress(args, ctx) {
      return withLedgerErrors(() => showAddress(appInContext(ctx), args, ctx));
    },
  };
}
