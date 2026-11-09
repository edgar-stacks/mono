import {
  type DeviceActionState,
  DeviceActionStatus,
  RefusedByUserDAError,
  UserInteractionRequired,
} from '@ledgerhq/device-management-kit';
import {
  DefaultDescriptorTemplate,
  DefaultWallet,
  type RegisterWalletDAError,
  type RegisterWalletDAIntermediateValue,
  RegisteredWallet,
  type SignerBtc,
} from '@ledgerhq/device-signer-kit-bitcoin';
import { bytesToHex, hexToBytes } from '@noble/hashes/utils';
import { HDKey } from '@scure/bip32';
import * as btc from '@scure/btc-signer';
import { Psbt } from 'bitcoinjs-lib';
import { of, throwError } from 'rxjs';

import {
  compileWshDescriptor,
  ecdsaPublicKeyToSchnorr,
  findAccountDescriptorKey,
  toWalletPolicyDescriptor,
} from '@leather.io/bitcoin';

import { makeFakeOperationContext } from '../contract/hardware-wallet.test-utils';
import { fakeSignerAction, makeFakeLedgerBitcoinApp } from '../ledger-app.test-utils';
import { createLedgerBitcoinSigner } from './ledger-bitcoin-signer';

function requireDefined<T>(value: T | null | undefined): T {
  if (value === null || value === undefined) throw new Error('Expected value to be defined');
  return value;
}

const masterFingerprintHex = 'deadbeef';
const rootKey = HDKey.fromMasterSeed(new Uint8Array(32).fill(1));

function makeNativeSegwitAccountKeychain(seedByte: number) {
  return HDKey.fromMasterSeed(new Uint8Array(32).fill(seedByte)).derive("m/84'/0'/0'");
}

function deriveAddressIndexKey(seedByte: number) {
  return makeNativeSegwitAccountKeychain(seedByte).deriveChild(0).deriveChild(0);
}

function makeSigner(signer: Partial<SignerBtc> = {}) {
  const app = makeFakeLedgerBitcoinApp({
    getMasterFingerprint: () =>
      fakeSignerAction({ masterFingerprint: hexToBytes(masterFingerprintHex) }),
    ...signer,
  });
  return { app, bitcoinSigner: createLedgerBitcoinSigner(app) };
}

function toPsbt(psbt: unknown) {
  if (typeof psbt !== 'string') throw new Error('Expected a base64 psbt');
  return Psbt.fromBase64(psbt);
}

function toDefaultWallet(wallet: unknown) {
  if (!(wallet instanceof DefaultWallet)) throw new Error('Expected a default wallet');
  return wallet;
}

function hasPartialSigFor(tx: btc.Transaction, inputIndex: number, publicKey: Uint8Array) {
  const pubkeyHex = bytesToHex(publicKey);
  return tx.getInput(inputIndex).partialSig?.some(([pubkey]) => bytesToHex(pubkey) === pubkeyHex);
}

describe('requestAccountKeys', () => {
  test('requests native segwit then taproot account keys with their wallet policies', async () => {
    const getExtendedPublicKey = vi.fn((path: string) =>
      fakeSignerAction({ extendedPublicKey: `xpub-${path}` })
    );
    const { bitcoinSigner } = makeSigner({ getExtendedPublicKey });
    const onRequestKey = vi.fn();

    const { fingerprint, keys } = await bitcoinSigner.requestAccountKeys(
      { network: 'mainnet', accountCount: 2, onRequestKey },
      makeFakeOperationContext()
    );

    expect(fingerprint).toBe(masterFingerprintHex);
    expect(keys.map(key => [key.paymentType, key.accountIndex, key.derivationPath])).toEqual([
      ['p2wpkh', 0, "m/84'/0'/0'"],
      ['p2wpkh', 1, "m/84'/0'/1'"],
      ['p2tr', 0, "m/86'/0'/0'"],
      ['p2tr', 1, "m/86'/0'/1'"],
    ]);
    expect(keys[0]).toMatchObject({
      xpub: "xpub-84'/0'/0'",
      policy: `[${masterFingerprintHex}/84'/0'/0']xpub-84'/0'/0'`,
    });
    expect(onRequestKey).toHaveBeenNthCalledWith(3, { paymentType: 'p2tr', accountIndex: 0 });
  });

  test('stops requesting keys once the operation is aborted', async () => {
    const controller = new AbortController();
    const getExtendedPublicKey = vi.fn(() => {
      controller.abort();
      return fakeSignerAction({ extendedPublicKey: 'xpub' });
    });
    const { bitcoinSigner } = makeSigner({ getExtendedPublicKey });

    await expect(
      bitcoinSigner.requestAccountKeys(
        { network: 'mainnet', accountCount: 10 },
        makeFakeOperationContext({ signal: controller.signal })
      )
    ).rejects.toMatchObject({ kind: 'cancelled' });
    expect(getExtendedPublicKey).toHaveBeenCalledOnce();
  });
});

describe('signPsbt with default wallets', () => {
  const nativeSegwitKey = rootKey.derive("m/84'/0'/0'/0/0");
  const taprootKey = rootKey.derive("m/86'/0'/0'/0/0");
  const secondAccountNativeSegwitKey = rootKey.derive("m/84'/0'/1'/0/0");

  function buildTx() {
    const tx = new btc.Transaction();
    tx.addInput({
      txid: hexToBytes('00'.repeat(32)),
      index: 0,
      witnessUtxo: {
        script: btc.p2wpkh(requireDefined(nativeSegwitKey.publicKey)).script,
        amount: 10_000n,
      },
    });
    tx.addInput({
      txid: hexToBytes('11'.repeat(32)),
      index: 0,
      witnessUtxo: {
        script: btc.p2tr(ecdsaPublicKeyToSchnorr(requireDefined(taprootKey.publicKey))).script,
        amount: 10_000n,
      },
    });
    tx.addInput({
      txid: hexToBytes('22'.repeat(32)),
      index: 0,
      witnessUtxo: {
        script: btc.p2wpkh(requireDefined(secondAccountNativeSegwitKey.publicKey)).script,
        amount: 10_000n,
      },
    });
    tx.addOutput({
      script: btc.p2wpkh(requireDefined(deriveAddressIndexKey(3).publicKey)).script,
      amount: 25_000n,
    });
    return tx;
  }

  function signatureFor(key: HDKey, inputIndex: number) {
    const tx = buildTx();
    tx.signIdx(requireDefined(key.privateKey), inputIndex);
    const [pubkey, signature] = requireDefined(tx.getInput(inputIndex).partialSig)[0];
    return { inputIndex, pubkey, signature };
  }

  const inputsToSign = [
    {
      index: 0,
      derivationPath: "m/84'/0'/0'/0/0",
      publicKey: requireDefined(nativeSegwitKey.publicKey),
    },
    {
      index: 1,
      derivationPath: "m/86'/0'/0'/0/0",
      publicKey: requireDefined(taprootKey.publicKey),
    },
    {
      index: 2,
      derivationPath: "m/84'/0'/1'/0/0",
      publicKey: requireDefined(secondAccountNativeSegwitKey.publicKey),
    },
  ];

  test('signs taproot then native segwit inputs grouped by account and merges the signatures', async () => {
    const tapKeySig = new Uint8Array(64).fill(9);
    const signedPsbts: Psbt[] = [];
    const signPsbt = vi.fn<SignerBtc['signPsbt']>((wallet, psbtBase64) => {
      signedPsbts.push(toPsbt(psbtBase64));
      const defaultWallet = toDefaultWallet(wallet);
      if (defaultWallet.template === DefaultDescriptorTemplate.TAPROOT)
        return fakeSignerAction([
          { inputIndex: 1, pubkey: new Uint8Array(32), signature: tapKeySig },
        ]);
      if (defaultWallet.derivationPath === "84'/0'/0'")
        return fakeSignerAction([signatureFor(nativeSegwitKey, 0)]);
      return fakeSignerAction([signatureFor(secondAccountNativeSegwitKey, 2)]);
    });
    const { bitcoinSigner } = makeSigner({ signPsbt });

    const signed = btc.Transaction.fromPSBT(
      await bitcoinSigner.signPsbt(
        { psbt: buildTx().toPSBT(), network: 'mainnet', inputsToSign },
        makeFakeOperationContext()
      )
    );

    expect(
      signPsbt.mock.calls.map(([wallet]) => {
        const defaultWallet = toDefaultWallet(wallet);
        return [defaultWallet.template, defaultWallet.derivationPath];
      })
    ).toEqual([
      [DefaultDescriptorTemplate.TAPROOT, "86'/0'/0'"],
      [DefaultDescriptorTemplate.NATIVE_SEGWIT, "84'/0'/0'"],
      [DefaultDescriptorTemplate.NATIVE_SEGWIT, "84'/0'/1'"],
    ]);
    const tapBip32Derivation = signedPsbts[0]?.data.inputs[1]?.tapBip32Derivation?.[0];
    expect(bytesToHex(requireDefined(tapBip32Derivation).masterFingerprint)).toBe(
      masterFingerprintHex
    );
    expect(tapBip32Derivation?.path).toBe("m/86'/0'/0'/0/0");
    expect(signedPsbts[1]?.data.inputs[0]?.bip32Derivation?.[0]?.path).toBe("m/84'/0'/0'/0/0");
    expect(signed.getInput(1).tapKeySig).toEqual(tapKeySig);
    expect(hasPartialSigFor(signed, 0, requireDefined(nativeSegwitKey.publicKey))).toBe(true);
    expect(
      hasPartialSigFor(signed, 2, requireDefined(secondAccountNativeSegwitKey.publicKey))
    ).toBe(true);
  });

  test('skips derivation entries that are already present', async () => {
    const tx = buildTx();
    tx.updateInput(0, {
      bip32Derivation: [
        [
          requireDefined(nativeSegwitKey.publicKey),
          { fingerprint: 1, path: btc.bip32Path("m/84'/0'/0'/0/0") },
        ],
      ],
    });
    const signPsbt = vi.fn<SignerBtc['signPsbt']>((_wallet, psbtBase64) => {
      expect(toPsbt(psbtBase64).data.inputs[0]?.bip32Derivation).toHaveLength(1);
      return fakeSignerAction([signatureFor(nativeSegwitKey, 0)]);
    });
    const { bitcoinSigner } = makeSigner({ signPsbt });

    await bitcoinSigner.signPsbt(
      { psbt: tx.toPSBT(), network: 'mainnet', inputsToSign: [requireDefined(inputsToSign[0])] },
      makeFakeOperationContext()
    );

    expect(signPsbt).toHaveBeenCalledOnce();
  });

  test('maps a rejection on the device', async () => {
    const { bitcoinSigner } = makeSigner({
      signPsbt: () => ({
        observable: throwError(() => new RefusedByUserDAError()),
        cancel: vi.fn(),
      }),
    });

    await expect(
      bitcoinSigner.signPsbt(
        { psbt: buildTx().toPSBT(), network: 'mainnet', inputsToSign },
        makeFakeOperationContext()
      )
    ).rejects.toMatchObject({ kind: 'rejected' });
  });
});

describe('signPsbt with a wallet policy', () => {
  const accountKeyOrigin = `${masterFingerprintHex}/84'/0'/0'`;
  const accountKeychain = makeNativeSegwitAccountKeychain(1);
  const accountAddressIndexKey = deriveAddressIndexKey(1);
  const cosignerAddressIndexKey = deriveAddressIndexKey(2);
  const cosignerXpub = makeNativeSegwitAccountKeychain(2).publicExtendedKey;
  const multiSigDescriptor = `wsh(multi(2,${cosignerXpub}/0/0,${accountKeychain.publicExtendedKey}/0/0))`;
  const registeredLedgerTemplate = 'wsh(multi(2,@0/**,@1/**))';
  const registeredPolicyHmac = new Uint8Array(32).fill(7);
  const inputsToSign = [
    {
      index: 0,
      derivationPath: "m/84'/0'/0'/0/0",
      publicKey: requireDefined(accountAddressIndexKey.publicKey),
    },
  ];

  function toPolicyDescriptor(descriptor: string) {
    const accountKey = requireDefined(
      findAccountDescriptorKey(compileWshDescriptor(descriptor), accountKeychain)
    ).key;
    return toWalletPolicyDescriptor(
      descriptor,
      accountKey,
      accountKeychain.publicExtendedKey,
      accountKeyOrigin
    );
  }

  function buildDescriptorTx(signWith: HDKey[]) {
    const { scriptPubKey, witnessScript } = compileWshDescriptor(multiSigDescriptor);
    const tx = new btc.Transaction({ allowUnknownInputs: true });
    tx.addInput({
      txid: hexToBytes('00'.repeat(32)),
      index: 0,
      witnessUtxo: { script: scriptPubKey, amount: 20_000n },
      witnessScript,
    });
    tx.addOutput({
      script: btc.p2wpkh(requireDefined(deriveAddressIndexKey(3).publicKey)).script,
      amount: 18_000n,
    });
    for (const key of signWith) tx.signIdx(requireDefined(key.privateKey), 0);
    return tx;
  }

  // The signature the device would produce: signing is deterministic (RFC 6979),
  // so signing the same tx with the account key yields the exact bytes a real
  // device merge would.
  function makeDevicePartialSig() {
    const tx = buildDescriptorTx([accountAddressIndexKey]);
    const [pubkey, signature] = requireDefined(tx.getInput(0).partialSig)[0];
    return { inputIndex: 0, pubkey, signature };
  }

  function setup() {
    let partialSigPubkeysAtSignTime: string[] | undefined;
    const registerWallet = vi.fn<SignerBtc['registerWallet']>(policy =>
      fakeSignerAction(
        new RegisteredWallet(
          policy.name,
          policy.descriptorTemplate,
          policy.keys,
          registeredPolicyHmac
        )
      )
    );
    const signPsbt = vi.fn<SignerBtc['signPsbt']>((_wallet, psbtBase64) => {
      partialSigPubkeysAtSignTime = toPsbt(psbtBase64).data.inputs[0]?.partialSig?.map(sig =>
        bytesToHex(sig.pubkey)
      );
      return fakeSignerAction([makeDevicePartialSig()]);
    });
    const { bitcoinSigner } = makeSigner({ registerWallet, signPsbt });

    async function sign(signWith: HDKey[], onInteraction = vi.fn()) {
      const signed = await bitcoinSigner.signPsbt(
        {
          psbt: buildDescriptorTx(signWith).toPSBT(),
          network: 'mainnet',
          inputsToSign,
          policyDescriptor: toPolicyDescriptor(multiSigDescriptor),
        },
        makeFakeOperationContext({ onInteraction })
      );
      return btc.Transaction.fromPSBT(signed);
    }

    return {
      registerWallet,
      signPsbt,
      sign,
      getPartialSigPubkeysAtSignTime: () => partialSigPubkeysAtSignTime,
    };
  }

  test('signs a psbt with no existing signatures', async () => {
    const { sign, getPartialSigPubkeysAtSignTime } = setup();

    const signedTx = await sign([]);

    expect(getPartialSigPubkeysAtSignTime()).toBeUndefined();
    expect(hasPartialSigFor(signedTx, 0, requireDefined(accountAddressIndexKey.publicKey))).toBe(
      true
    );
  });

  test('strips only the stale account signature, keeping the co-signer signature', async () => {
    const { sign, getPartialSigPubkeysAtSignTime } = setup();

    const signedTx = await sign([accountAddressIndexKey, cosignerAddressIndexKey]);

    expect(getPartialSigPubkeysAtSignTime()).toEqual([
      bytesToHex(requireDefined(cosignerAddressIndexKey.publicKey)),
    ]);
    expect(hasPartialSigFor(signedTx, 0, requireDefined(accountAddressIndexKey.publicKey))).toBe(
      true
    );
    expect(hasPartialSigFor(signedTx, 0, requireDefined(cosignerAddressIndexKey.publicKey))).toBe(
      true
    );
  });

  test('removes the partialSig field entirely when only the account had signed', async () => {
    const { sign, getPartialSigPubkeysAtSignTime } = setup();

    await sign([accountAddressIndexKey]);

    expect(getPartialSigPubkeysAtSignTime()).toBeUndefined();
  });

  test('registers the Leather policy and signs with the registered wallet', async () => {
    const { sign, registerWallet, signPsbt } = setup();

    await sign([]);

    expect(registerWallet).toHaveBeenCalledOnce();
    expect(registerWallet.mock.calls[0]?.[0]).toMatchObject({
      name: 'Leather',
      descriptorTemplate: registeredLedgerTemplate,
      keys: [cosignerXpub, `[${accountKeyOrigin}]${accountKeychain.publicExtendedKey}`],
    });
    expect(signPsbt.mock.calls[0]?.[0]).toMatchObject({ hmac: registeredPolicyHmac });
  });

  test('reports the policy approval prompt', async () => {
    const { sign, registerWallet } = setup();
    registerWallet.mockImplementation(policy => {
      type RegisterWalletState = DeviceActionState<
        RegisteredWallet,
        RegisterWalletDAError,
        RegisterWalletDAIntermediateValue
      >;
      const pending: RegisterWalletState = {
        status: DeviceActionStatus.Pending,
        intermediateValue: { requiredUserInteraction: UserInteractionRequired.RegisterWallet },
      };
      const completed: RegisterWalletState = {
        status: DeviceActionStatus.Completed,
        output: new RegisteredWallet(
          policy.name,
          policy.descriptorTemplate,
          policy.keys,
          registeredPolicyHmac
        ),
      };
      return { observable: of(pending, completed), cancel: vi.fn() };
    });
    const onInteraction = vi.fn();

    await sign([], onInteraction);

    expect(onInteraction).toHaveBeenCalledWith({ type: 'approve-policy' });
  });
});

describe('showAddress', () => {
  test('displays the default wallet receive address', async () => {
    const getWalletAddress = vi.fn<SignerBtc['getWalletAddress']>(() =>
      fakeSignerAction({ address: 'bc1q-device' })
    );
    const { bitcoinSigner } = makeSigner({ getWalletAddress });

    await expect(
      bitcoinSigner.showAddress(
        { kind: 'default', paymentType: 'p2tr', network: 'mainnet', accountIndex: 2 },
        makeFakeOperationContext()
      )
    ).resolves.toBe('bc1q-device');
    const [wallet, addressIndex, options] = getWalletAddress.mock.calls[0] ?? [];
    expect(wallet).toBeInstanceOf(DefaultWallet);
    expect(wallet).toMatchObject({
      derivationPath: "86'/0'/2'",
      template: DefaultDescriptorTemplate.TAPROOT,
    });
    expect(addressIndex).toBe(0);
    expect(options).toMatchObject({ checkOnDevice: true, change: false });
  });

  test('registers the policy and displays the policy address at its key path', async () => {
    const accountKeychain = makeNativeSegwitAccountKeychain(1);
    const cosignerXpub = makeNativeSegwitAccountKeychain(2).publicExtendedKey;
    const policyDescriptor = `wsh(multi(2,${cosignerXpub}/0/*,[${masterFingerprintHex}/84'/0'/0']${accountKeychain.publicExtendedKey}/0/*))`;
    const registerWallet = vi.fn<SignerBtc['registerWallet']>(policy =>
      fakeSignerAction(
        new RegisteredWallet(
          policy.name,
          policy.descriptorTemplate,
          policy.keys,
          new Uint8Array(32)
        )
      )
    );
    const getWalletAddress = vi.fn<SignerBtc['getWalletAddress']>(() =>
      fakeSignerAction({ address: 'bc1q-policy' })
    );
    const { bitcoinSigner } = makeSigner({ registerWallet, getWalletAddress });

    await expect(
      bitcoinSigner.showAddress(
        { kind: 'policy', policyDescriptor, changeIndex: 1, addressIndex: 4 },
        makeFakeOperationContext()
      )
    ).resolves.toBe('bc1q-policy');
    expect(registerWallet).toHaveBeenCalledOnce();
    const [wallet, addressIndex, options] = getWalletAddress.mock.calls[0] ?? [];
    expect(wallet).toBeInstanceOf(RegisteredWallet);
    expect(addressIndex).toBe(4);
    expect(options).toMatchObject({ change: true });
  });
});
