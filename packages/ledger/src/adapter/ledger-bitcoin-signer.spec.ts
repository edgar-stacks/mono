import {
  type DeviceActionState,
  DeviceActionStatus,
  GlobalCommandError,
  UserInteractionRequired,
} from '@ledgerhq/device-management-kit';
import {
  DefaultDescriptorTemplate,
  DefaultWallet,
  type RegisterWalletDAError,
  type RegisterWalletDAIntermediateValue,
  RegisteredWallet,
  type SignerBtc,
  WalletPolicy,
} from '@ledgerhq/device-signer-kit-bitcoin';
import { bytesToHex } from '@noble/hashes/utils';
import { HDKey } from '@scure/bip32';
import * as btc from '@scure/btc-signer';
import { Psbt } from 'bitcoinjs-lib';
import { of } from 'rxjs';

import { compileWshDescriptor, ecdsaPublicKeyToSchnorr } from '@leather.io/bitcoin';

import { fakeSignerAction, makeFakeLedgerBitcoinApp } from '../ledger-app.test-utils';
import { createLedgerBitcoinSigner } from './ledger-bitcoin-signer';

const fingerprint = 'deadbeef';
const nativeSegwitPath = "m/84'/0'/0'/0/0";
const taprootPath = "m/86'/0'/0'/0/0";
const seed = new Uint8Array(32).fill(1);

function toKeyPair(key: HDKey) {
  if (!key.publicKey || !key.privateKey) throw new Error('Expected key bytes');
  return { publicKey: key.publicKey, privateKey: key.privateKey };
}

function requireKey(path: string) {
  return toKeyPair(HDKey.fromMasterSeed(seed).derive(path));
}

const nativeSegwitKey = requireKey(nativeSegwitPath);
const taprootKey = requireKey(taprootPath);

const accountKeyOrigin = `${fingerprint}/84'/0'/0'`;
const accountXpub = HDKey.fromMasterSeed(seed).derive("m/84'/0'/0'").publicExtendedKey;
const cosignerAccount = HDKey.fromMasterSeed(new Uint8Array(32).fill(2)).derive("m/84'/0'/0'");
const cosignerXpub = cosignerAccount.publicExtendedKey;
const cosignerKey = toKeyPair(cosignerAccount.deriveChild(0).deriveChild(0));
const walletPolicyDescriptor = `wsh(multi(2,${cosignerXpub}/0/0,[${accountKeyOrigin}]${accountXpub}/0/0))`;
const registeredPolicyHmac = new Uint8Array(32).fill(7);

function makeNativeSegwitTx() {
  const tx = new btc.Transaction();
  [0, 1].forEach(index =>
    tx.addInput({
      txid: new Uint8Array(32).fill(index + 1),
      index,
      witnessUtxo: { script: btc.p2wpkh(nativeSegwitKey.publicKey).script, amount: 10_000n },
    })
  );
  tx.addOutput({ script: btc.p2wpkh(nativeSegwitKey.publicKey).script, amount: 9_000n });
  return tx;
}

function makeNativeSegwitSignature(inputIndex: number) {
  const tx = makeNativeSegwitTx();
  tx.signIdx(nativeSegwitKey.privateKey, inputIndex);
  const partialSig = tx.getInput(inputIndex).partialSig;
  if (!partialSig?.[0]) throw new Error('Expected a partial signature');
  return partialSig[0][1];
}

function makeTaprootTx() {
  const tx = new btc.Transaction();
  const xOnlyPublicKey = ecdsaPublicKeyToSchnorr(taprootKey.publicKey);
  tx.addInput({
    txid: new Uint8Array(32).fill(9),
    index: 0,
    witnessUtxo: { script: btc.p2tr(xOnlyPublicKey).script, amount: 10_000n },
    tapInternalKey: xOnlyPublicKey,
  });
  tx.addOutput({ script: btc.p2tr(xOnlyPublicKey).script, amount: 9_000n });
  return tx;
}

function toPsbt(bytes: Uint8Array) {
  return Psbt.fromBuffer(Buffer.from(bytes));
}

function signedPsbtArg(psbt: unknown) {
  if (typeof psbt !== 'string') throw new Error('Expected a base64 PSBT');
  return Psbt.fromBuffer(Buffer.from(psbt, 'base64'));
}

function makeApp(signer: Partial<SignerBtc> = {}) {
  return makeFakeLedgerBitcoinApp({
    getMasterFingerprint: vi.fn(() =>
      fakeSignerAction({ masterFingerprint: Uint8Array.from([0xde, 0xad, 0xbe, 0xef]) })
    ),
    ...signer,
  });
}

describe(createLedgerBitcoinSigner.name, () => {
  describe('getMasterFingerprint', () => {
    test('returns the device fingerprint as hex', async () => {
      await expect(createLedgerBitcoinSigner(makeApp()).getMasterFingerprint({})).resolves.toBe(
        fingerprint
      );
    });

    test('maps a refusal on the device to a rejected error', async () => {
      const app = makeApp({
        getMasterFingerprint: vi.fn<SignerBtc['getMasterFingerprint']>(() => ({
          observable: of({
            status: DeviceActionStatus.Error,
            error: new GlobalCommandError({ errorCode: '5501', message: 'Refused' }),
          }),
          cancel: vi.fn(),
        })),
      });

      await expect(createLedgerBitcoinSigner(app).getMasterFingerprint({})).rejects.toMatchObject({
        kind: 'rejected',
      });
    });
  });

  describe('requestAccountKeys', () => {
    test('requests native segwit then taproot account keys with their wallet policy keys', async () => {
      const getExtendedPublicKey = vi.fn<SignerBtc['getExtendedPublicKey']>(path =>
        fakeSignerAction({ extendedPublicKey: `xpub-${path}` })
      );
      const onRequestKey = vi.fn();

      const { fingerprint: deviceFingerprint, keys } = await createLedgerBitcoinSigner(
        makeApp({ getExtendedPublicKey })
      ).requestAccountKeys({ network: 'mainnet', count: 2, onRequestKey }, {});

      expect(deviceFingerprint).toBe(fingerprint);
      expect(keys).toEqual([
        {
          paymentType: 'p2wpkh',
          accountIndex: 0,
          path: "m/84'/0'/0'",
          xpub: "xpub-84'/0'/0'",
          descriptor: "[deadbeef/84'/0'/0']xpub-84'/0'/0'",
        },
        {
          paymentType: 'p2wpkh',
          accountIndex: 1,
          path: "m/84'/0'/1'",
          xpub: "xpub-84'/0'/1'",
          descriptor: "[deadbeef/84'/0'/1']xpub-84'/0'/1'",
        },
        {
          paymentType: 'p2tr',
          accountIndex: 0,
          path: "m/86'/0'/0'",
          xpub: "xpub-86'/0'/0'",
          descriptor: "[deadbeef/86'/0'/0']xpub-86'/0'/0'",
        },
        {
          paymentType: 'p2tr',
          accountIndex: 1,
          path: "m/86'/0'/1'",
          xpub: "xpub-86'/0'/1'",
          descriptor: "[deadbeef/86'/0'/1']xpub-86'/0'/1'",
        },
      ]);
      expect(onRequestKey.mock.calls).toEqual([
        [{ paymentType: 'p2wpkh', accountIndex: 0 }],
        [{ paymentType: 'p2wpkh', accountIndex: 1 }],
        [{ paymentType: 'p2tr', accountIndex: 0 }],
        [{ paymentType: 'p2tr', accountIndex: 1 }],
      ]);
    });

    test('uses the testnet coin type on testnet', async () => {
      const getExtendedPublicKey = vi.fn<SignerBtc['getExtendedPublicKey']>(path =>
        fakeSignerAction({ extendedPublicKey: `xpub-${path}` })
      );

      const { keys } = await createLedgerBitcoinSigner(
        makeApp({ getExtendedPublicKey })
      ).requestAccountKeys({ network: 'testnet', count: 1 }, {});

      expect(keys.map(({ path }) => path)).toEqual(["m/84'/1'/0'", "m/86'/1'/0'"]);
    });

    test('stops requesting keys once the signal aborts', async () => {
      const controller = new AbortController();
      const getExtendedPublicKey = vi.fn<SignerBtc['getExtendedPublicKey']>(path => {
        controller.abort();
        return fakeSignerAction({ extendedPublicKey: `xpub-${path}` });
      });

      await expect(
        createLedgerBitcoinSigner(makeApp({ getExtendedPublicKey })).requestAccountKeys(
          { network: 'mainnet', count: 3 },
          { signal: controller.signal }
        )
      ).rejects.toMatchObject({ kind: 'cancelled' });
      expect(getExtendedPublicKey).toHaveBeenCalledOnce();
    });
  });

  describe('signPsbt', () => {
    test('signs native segwit inputs with the account default wallet and adds their derivation', async () => {
      const signature = makeNativeSegwitSignature(1);
      const signPsbt = vi.fn<SignerBtc['signPsbt']>(() =>
        fakeSignerAction([{ inputIndex: 1, pubkey: nativeSegwitKey.publicKey, signature }])
      );

      const signed = await createLedgerBitcoinSigner(makeApp({ signPsbt })).signPsbt(
        {
          psbt: makeNativeSegwitTx().toPSBT(),
          network: 'mainnet',
          inputsToSign: [
            { index: 1, derivationPath: nativeSegwitPath, publicKey: nativeSegwitKey.publicKey },
          ],
        },
        {}
      );

      const [wallet, psbtBase64] = signPsbt.mock.calls[0];
      expect(wallet).toBeInstanceOf(DefaultWallet);
      expect(wallet).toMatchObject({
        derivationPath: "84'/0'/0'",
        template: DefaultDescriptorTemplate.NATIVE_SEGWIT,
      });
      expect(signedPsbtArg(psbtBase64).data.inputs[1].bip32Derivation).toEqual([
        {
          masterFingerprint: Buffer.from(fingerprint, 'hex'),
          pubkey: Buffer.from(nativeSegwitKey.publicKey),
          path: nativeSegwitPath,
        },
      ]);
      const signedInputs = toPsbt(signed).data.inputs;
      expect(signedInputs[1].partialSig).toEqual([
        { pubkey: Buffer.from(nativeSegwitKey.publicKey), signature: Buffer.from(signature) },
      ]);
      expect(signedInputs[0].partialSig).toBeUndefined();
    });

    test('keeps a derivation the PSBT already carries for the input key', async () => {
      const psbt = toPsbt(makeNativeSegwitTx().toPSBT());
      const existingDerivation = {
        masterFingerprint: Buffer.from('cafebabe', 'hex'),
        pubkey: Buffer.from(nativeSegwitKey.publicKey),
        path: nativeSegwitPath,
      };
      psbt.updateInput(0, { bip32Derivation: [existingDerivation] });
      const signPsbt = vi.fn<SignerBtc['signPsbt']>(() => fakeSignerAction([]));

      const signed = await createLedgerBitcoinSigner(makeApp({ signPsbt })).signPsbt(
        {
          psbt: psbt.toBuffer(),
          network: 'mainnet',
          inputsToSign: [
            { index: 0, derivationPath: nativeSegwitPath, publicKey: nativeSegwitKey.publicKey },
          ],
        },
        {}
      );

      expect(toPsbt(signed).data.inputs[0].bip32Derivation).toEqual([existingDerivation]);
    });

    test('signs taproot inputs with the taproot default wallet before native segwit inputs', async () => {
      const tapKeySig = new Uint8Array(64).fill(7);
      const signPsbt = vi.fn<SignerBtc['signPsbt']>(wallet =>
        fakeSignerAction(
          wallet instanceof DefaultWallet && wallet.template === DefaultDescriptorTemplate.TAPROOT
            ? [{ inputIndex: 0, pubkey: taprootKey.publicKey, signature: tapKeySig }]
            : []
        )
      );
      const xOnlyPublicKey = ecdsaPublicKeyToSchnorr(taprootKey.publicKey);

      const signed = await createLedgerBitcoinSigner(makeApp({ signPsbt })).signPsbt(
        {
          psbt: makeTaprootTx().toPSBT(),
          network: 'mainnet',
          inputsToSign: [
            { index: 0, derivationPath: taprootPath, publicKey: taprootKey.publicKey },
          ],
        },
        {}
      );

      expect(signPsbt).toHaveBeenCalledOnce();
      expect(signPsbt.mock.calls[0][0]).toMatchObject({
        derivationPath: "86'/0'/0'",
        template: DefaultDescriptorTemplate.TAPROOT,
      });
      const [input] = toPsbt(signed).data.inputs;
      expect(input.tapKeySig).toEqual(Buffer.from(tapKeySig));
      expect(input.tapBip32Derivation).toEqual([
        {
          masterFingerprint: Buffer.from(fingerprint, 'hex'),
          pubkey: Buffer.from(xOnlyPublicKey),
          path: taprootPath,
          leafHashes: [],
        },
      ]);
    });

    test('signs each account with its own default wallet', async () => {
      const signPsbt = vi.fn<SignerBtc['signPsbt']>(() => fakeSignerAction([]));
      const otherAccountKey = requireKey("m/84'/0'/3'/0/0");

      await createLedgerBitcoinSigner(makeApp({ signPsbt })).signPsbt(
        {
          psbt: makeNativeSegwitTx().toPSBT(),
          network: 'mainnet',
          inputsToSign: [
            { index: 0, derivationPath: nativeSegwitPath, publicKey: nativeSegwitKey.publicKey },
            {
              index: 1,
              derivationPath: "m/84'/0'/3'/0/0",
              publicKey: otherAccountKey.publicKey,
            },
          ],
        },
        {}
      );

      expect(signPsbt.mock.calls.map(([wallet]) => wallet)).toEqual([
        expect.objectContaining({ derivationPath: "84'/0'/0'" }),
        expect.objectContaining({ derivationPath: "84'/0'/3'" }),
      ]);
    });

    test('rejects inputs the default wallets cannot sign', async () => {
      await expect(
        createLedgerBitcoinSigner(makeApp()).signPsbt(
          {
            psbt: makeNativeSegwitTx().toPSBT(),
            network: 'mainnet',
            inputsToSign: [
              {
                index: 0,
                derivationPath: "m/44'/0'/0'/0/0",
                publicKey: nativeSegwitKey.publicKey,
              },
            ],
          },
          {}
        )
      ).rejects.toMatchObject({ kind: 'unsupported' });
    });

    test('rejects an input index the PSBT does not have', async () => {
      await expect(
        createLedgerBitcoinSigner(makeApp()).signPsbt(
          {
            psbt: makeNativeSegwitTx().toPSBT(),
            network: 'mainnet',
            inputsToSign: [
              { index: 5, derivationPath: nativeSegwitPath, publicKey: nativeSegwitKey.publicKey },
            ],
          },
          {}
        )
      ).rejects.toMatchObject({ kind: 'invalid-payload' });
    });
  });

  describe('showAddress', () => {
    test('displays a default wallet address at the given indexes', async () => {
      const getWalletAddress = vi.fn<SignerBtc['getWalletAddress']>(() =>
        fakeSignerAction({ address: 'bc1p-device' })
      );

      const address = await createLedgerBitcoinSigner(makeApp({ getWalletAddress })).showAddress(
        {
          kind: 'default',
          paymentType: 'p2tr',
          network: 'mainnet',
          accountIndex: 1,
          changeIndex: 0,
          addressIndex: 0,
        },
        {}
      );

      expect(address).toBe('bc1p-device');
      const [wallet, addressIndex, options] = getWalletAddress.mock.calls[0];
      expect(wallet).toMatchObject({
        derivationPath: "86'/0'/1'",
        template: DefaultDescriptorTemplate.TAPROOT,
      });
      expect(addressIndex).toBe(0);
      expect(options).toEqual({ checkOnDevice: true, change: false, skipOpenApp: true });
    });

    test('registers the wallet policy and displays its address at the descriptor indexes', async () => {
      const registeredWallet = new RegisteredWallet(
        'Leather',
        'wsh(multi(2,@0/**,@1/**))',
        [],
        new Uint8Array(32)
      );
      const getWalletAddress = vi.fn<SignerBtc['getWalletAddress']>(() =>
        fakeSignerAction({ address: 'bc1q-multisig' })
      );
      const onInteraction = vi.fn();

      const address = await createLedgerBitcoinSigner(
        makeApp({
          registerWallet: vi.fn(() => fakeSignerAction(registeredWallet)),
          getWalletAddress,
        })
      ).showAddress(
        {
          kind: 'policy',
          policyDescriptor: walletPolicyDescriptor,
          changeIndex: 1,
          addressIndex: 4,
        },
        { onInteraction }
      );

      expect(address).toBe('bc1q-multisig');
      const [wallet, addressIndex, options] = getWalletAddress.mock.calls[0];
      expect(wallet).toBe(registeredWallet);
      expect(addressIndex).toBe(4);
      expect(options).toMatchObject({ change: true });
      expect(onInteraction).toHaveBeenCalledWith({ type: 'verify-address' });
    });
  });

  describe('signPsbt with a wallet policy', () => {
    function requireDefined<T>(value: T | null | undefined): T {
      if (value === null || value === undefined) throw new Error('Expected value to be defined');
      return value;
    }

    function buildDescriptorTx(signWith: Uint8Array[]) {
      const { scriptPubKey, witnessScript } = compileWshDescriptor(walletPolicyDescriptor);
      const tx = new btc.Transaction({ allowUnknownInputs: true });
      tx.addInput({
        txid: new Uint8Array(32).fill(0),
        index: 0,
        witnessUtxo: { script: scriptPubKey, amount: 20_000n },
        witnessScript,
      });
      tx.addOutput({ script: btc.p2wpkh(taprootKey.publicKey).script, amount: 18_000n });
      signWith.forEach(privateKey => tx.signIdx(privateKey, 0));
      return tx;
    }

    // The signature the device would produce: signing is deterministic (RFC 6979),
    // so signing the same tx with the account key yields the exact bytes a real
    // device merge would.
    function makeDevicePartialSig() {
      const tx = buildDescriptorTx([nativeSegwitKey.privateKey]);
      const [pubkey, signature] = requireDefined(tx.getInput(0).partialSig)[0];
      return { inputIndex: 0, pubkey, signature };
    }

    function hasPartialSigFor(psbt: Psbt, inputIndex: number, publicKey: Uint8Array) {
      const pubkeyHex = bytesToHex(publicKey);
      return (
        psbt.data.inputs[inputIndex]?.partialSig?.some(
          sig => bytesToHex(sig.pubkey) === pubkeyHex
        ) ?? false
      );
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
      const signPsbt = vi.fn<SignerBtc['signPsbt']>((_wallet, psbt) => {
        partialSigPubkeysAtSignTime = signedPsbtArg(psbt).data.inputs[0]?.partialSig?.map(sig =>
          bytesToHex(sig.pubkey)
        );
        return fakeSignerAction([makeDevicePartialSig()]);
      });
      const signer = createLedgerBitcoinSigner(makeApp({ registerWallet, signPsbt }));
      return {
        registerWallet,
        signPsbt,
        partialSigPubkeysAtSignTime: () => partialSigPubkeysAtSignTime,
        async sign(tx: btc.Transaction, ctx = {}) {
          return toPsbt(
            await signer.signPsbt(
              {
                psbt: tx.toPSBT(),
                network: 'mainnet',
                policyDescriptor: walletPolicyDescriptor,
                inputsToSign: [
                  {
                    index: 0,
                    derivationPath: nativeSegwitPath,
                    publicKey: nativeSegwitKey.publicKey,
                  },
                ],
              },
              ctx
            )
          );
        },
      };
    }

    test('signs a psbt with no existing signatures', async () => {
      const { sign, partialSigPubkeysAtSignTime } = setup();

      const signed = await sign(buildDescriptorTx([]));

      expect(partialSigPubkeysAtSignTime()).toBeUndefined();
      expect(hasPartialSigFor(signed, 0, nativeSegwitKey.publicKey)).toBe(true);
    });

    test('leaves a co-signer signature untouched when the account has not signed', async () => {
      const { sign, partialSigPubkeysAtSignTime } = setup();

      const signed = await sign(buildDescriptorTx([cosignerKey.privateKey]));

      expect(partialSigPubkeysAtSignTime()).toEqual([bytesToHex(cosignerKey.publicKey)]);
      expect(hasPartialSigFor(signed, 0, nativeSegwitKey.publicKey)).toBe(true);
      expect(hasPartialSigFor(signed, 0, cosignerKey.publicKey)).toBe(true);
    });

    test('strips only the stale account signature, keeping the co-signer signature', async () => {
      const { sign, partialSigPubkeysAtSignTime } = setup();

      const signed = await sign(
        buildDescriptorTx([nativeSegwitKey.privateKey, cosignerKey.privateKey])
      );

      expect(partialSigPubkeysAtSignTime()).toEqual([bytesToHex(cosignerKey.publicKey)]);
      expect(hasPartialSigFor(signed, 0, nativeSegwitKey.publicKey)).toBe(true);
      expect(hasPartialSigFor(signed, 0, cosignerKey.publicKey)).toBe(true);
    });

    test('removes the partialSig field entirely when only the account had signed', async () => {
      const { sign, partialSigPubkeysAtSignTime } = setup();

      const signed = await sign(buildDescriptorTx([nativeSegwitKey.privateKey]));

      expect(partialSigPubkeysAtSignTime()).toBeUndefined();
      expect(hasPartialSigFor(signed, 0, nativeSegwitKey.publicKey)).toBe(true);
    });

    test('adds the account derivation alongside a co-signer derivation', async () => {
      const { sign, signPsbt } = setup();
      const tx = buildDescriptorTx([]);
      tx.updateInput(0, {
        bip32Derivation: [
          [
            cosignerKey.publicKey,
            { fingerprint: 0x55667788, path: btc.bip32Path("m/48'/0'/0'/2'/0/0") },
          ],
        ],
      });

      await sign(tx);

      const derivations = signedPsbtArg(signPsbt.mock.calls[0][1]).data.inputs[0].bip32Derivation;
      expect(derivations?.map(({ pubkey }) => bytesToHex(pubkey)).sort()).toEqual(
        [bytesToHex(cosignerKey.publicKey), bytesToHex(nativeSegwitKey.publicKey)].sort()
      );
    });

    test('signs when the psbt carries a foreign input without derivation metadata', async () => {
      const { sign } = setup();
      const tx = buildDescriptorTx([]);
      tx.addInput({
        txid: new Uint8Array(32).fill(0x11),
        index: 0,
        witnessUtxo: { script: btc.p2wpkh(taprootKey.publicKey).script, amount: 30_000n },
      });

      const signed = await sign(tx);

      expect(hasPartialSigFor(signed, 0, nativeSegwitKey.publicKey)).toBe(true);
      expect(signed.data.inputs[1].partialSig).toBeUndefined();
    });

    test('registers the Leather policy and signs with the registered wallet', async () => {
      const { sign, registerWallet, signPsbt } = setup();
      const onInteraction = vi.fn();

      await sign(buildDescriptorTx([]), { onInteraction });

      expect(registerWallet).toHaveBeenCalledOnce();
      const [policy, registerOptions] = registerWallet.mock.calls[0];
      expect(policy).toBeInstanceOf(WalletPolicy);
      expect(policy).toMatchObject({
        name: 'Leather',
        descriptorTemplate: 'wsh(multi(2,@0/**,@1/**))',
        keys: [cosignerXpub, `[${accountKeyOrigin}]${accountXpub}`],
      });
      expect(registerOptions).toEqual({ skipOpenApp: true });
      const [wallet, , signOptions] = signPsbt.mock.calls[0];
      expect(wallet).toBeInstanceOf(RegisteredWallet);
      expect(wallet).toMatchObject({ hmac: registeredPolicyHmac });
      expect(signOptions).toEqual({ skipOpenApp: true });
      expect(onInteraction).toHaveBeenCalledWith({ type: 'confirm-on-device' });
    });

    test('reports the policy approval while the device waits for it', async () => {
      const { sign, registerWallet } = setup();
      registerWallet.mockImplementation(policy => {
        const states: DeviceActionState<
          RegisteredWallet,
          RegisterWalletDAError,
          RegisterWalletDAIntermediateValue
        >[] = [
          {
            status: DeviceActionStatus.Pending,
            intermediateValue: {
              requiredUserInteraction: UserInteractionRequired.RegisterWallet,
            },
          },
          {
            status: DeviceActionStatus.Completed,
            output: new RegisteredWallet(
              policy.name,
              policy.descriptorTemplate,
              policy.keys,
              registeredPolicyHmac
            ),
          },
        ];
        return { observable: of(...states), cancel: vi.fn() };
      });
      const onInteraction = vi.fn();

      await sign(buildDescriptorTx([]), { onInteraction });

      expect(onInteraction).toHaveBeenCalledWith({ type: 'approve-policy' });
    });
  });
});
