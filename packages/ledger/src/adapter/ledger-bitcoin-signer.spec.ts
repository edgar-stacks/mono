import {
  type DeviceActionState,
  DeviceActionStatus,
  type ExecuteDeviceActionReturnType,
  GlobalCommandError,
  UserInteractionRequired,
} from '@ledgerhq/device-management-kit';
import {
  DefaultDescriptorTemplate,
  DefaultWallet,
  RegisteredWallet,
  type SignPsbtDAOutput,
  type SignerBtc,
  WalletPolicy,
} from '@ledgerhq/device-signer-kit-bitcoin';
import { bytesToHex, hexToBytes } from '@noble/hashes/utils';
import { HDKey } from '@scure/bip32';
import * as btc from '@scure/btc-signer';
import { Psbt } from 'bitcoinjs-lib';
import { of } from 'rxjs';

import { compileWshDescriptor, ecdsaPublicKeyToSchnorr } from '@leather.io/bitcoin';

import { makeFakeOperationContext } from '../contract/hardware-wallet.test-utils';
import { fakeSignerAction, makeFakeLedgerBitcoinApp } from '../ledger-app.test-utils';
import { createLedgerBitcoinSigner } from './ledger-bitcoin-signer';

function requireDefined<T>(value: T | null | undefined): T {
  if (value === null || value === undefined) throw new Error('Expected value to be defined');
  return value;
}

const masterFingerprintHex = 'deadbeef';
const seed = new Uint8Array(32).fill(1);

function deriveKey(path: string) {
  return HDKey.fromMasterSeed(seed).derive(path);
}

function derivePublicKey(path: string) {
  return requireDefined(deriveKey(path).publicKey);
}

function makeNativeSegwitAccountKeychain(seedByte: number) {
  return HDKey.fromMasterSeed(new Uint8Array(32).fill(seedByte)).derive("m/84'/0'/0'");
}

const nativeSegwitPath = "m/84'/0'/0'/0/0";
const secondAccountNativeSegwitPath = "m/84'/0'/1'/0/0";
const taprootPath = "m/86'/0'/0'/0/0";

const accountKeychain = makeNativeSegwitAccountKeychain(1);
const accountKeyOrigin = `${masterFingerprintHex}/84'/0'/0'`;
const accountAddressIndexKey = accountKeychain.deriveChild(0).deriveChild(0);
const cosignerKeychain = makeNativeSegwitAccountKeychain(2);
const cosignerAddressIndexKey = cosignerKeychain.deriveChild(0).deriveChild(0);
const cosignerXpub = cosignerKeychain.publicExtendedKey;
const policyDescriptor = `wsh(multi(2,${cosignerXpub}/0/0,[${accountKeyOrigin}]${accountKeychain.publicExtendedKey}/0/0))`;
const registeredPolicyHmac = new Uint8Array(32).fill(7);

type SignPsbtArgs = Parameters<SignerBtc['signPsbt']>;

type SignerPsbt = SignPsbtArgs[1];

type DeviceActionStateOf<Action> =
  Action extends ExecuteDeviceActionReturnType<infer Output, infer Error, infer Intermediate>
    ? DeviceActionState<Output, Error, Intermediate>
    : never;

type SignPsbtState = DeviceActionStateOf<ReturnType<SignerBtc['signPsbt']>>;

type RegisterWalletState = DeviceActionStateOf<ReturnType<SignerBtc['registerWallet']>>;

function readSignerPsbt(psbt: SignerPsbt) {
  if (typeof psbt !== 'string') throw new Error('Expected a base64 PSBT');
  return Psbt.fromBase64(psbt);
}

interface FakeSignerOptions {
  signPsbt?(...args: SignPsbtArgs): ReturnType<SignerBtc['signPsbt']>;
}

function makeSigner({ signPsbt }: FakeSignerOptions = {}) {
  const signer = {
    getMasterFingerprint: vi.fn<SignerBtc['getMasterFingerprint']>(() =>
      fakeSignerAction({ masterFingerprint: hexToBytes(masterFingerprintHex) })
    ),
    getExtendedPublicKey: vi.fn<SignerBtc['getExtendedPublicKey']>(path =>
      fakeSignerAction({ extendedPublicKey: `xpub-${path}` })
    ),
    registerWallet: vi.fn<SignerBtc['registerWallet']>(policy =>
      fakeSignerAction(
        new RegisteredWallet(
          policy.name,
          policy.descriptorTemplate,
          policy.keys,
          registeredPolicyHmac
        )
      )
    ),
    signPsbt: vi.fn<SignerBtc['signPsbt']>(signPsbt ?? (() => fakeSignerAction([]))),
    getWalletAddress: vi.fn<SignerBtc['getWalletAddress']>(() =>
      fakeSignerAction({ address: 'bc1qdeviceaddress' })
    ),
  };
  return {
    signer,
    hardwareSigner: createLedgerBitcoinSigner(makeFakeLedgerBitcoinApp(signer), 'Bitcoin'),
  };
}

interface InputSpec {
  script: Uint8Array;
  witnessScript?: Uint8Array;
}

function buildPsbt(inputs: InputSpec[]) {
  const tx = new btc.Transaction({ allowUnknownInputs: true });
  inputs.forEach(({ script, witnessScript }, index) =>
    tx.addInput({
      txid: new Uint8Array(32).fill(index + 1),
      index,
      witnessUtxo: { script, amount: 20_000n },
      witnessScript,
    })
  );
  tx.addOutput({
    script: btc.p2wpkh(derivePublicKey("m/84'/0'/9'/0/0")).script,
    amount: 10_000n,
  });
  return tx;
}

function nativeSegwitInput(path: string): InputSpec {
  return { script: btc.p2wpkh(derivePublicKey(path)).script };
}

function taprootInput(path: string): InputSpec {
  return { script: btc.p2tr(ecdsaPublicKeyToSchnorr(derivePublicKey(path))).script };
}

function descriptorInput(): InputSpec {
  const { scriptPubKey, witnessScript } = compileWshDescriptor(policyDescriptor);
  return { script: scriptPubKey, witnessScript };
}

function signNativeSegwitInput(tx: btc.Transaction, inputIndex: number, key: HDKey) {
  const clone = btc.Transaction.fromPSBT(tx.toPSBT(), { allowUnknownInputs: true });
  clone.signIdx(requireDefined(key.privateKey), inputIndex);
  const [pubkey, signature] = requireDefined(clone.getInput(inputIndex).partialSig)[0];
  return { inputIndex, pubkey, signature };
}

function signedPsbtAction(signatures: SignPsbtDAOutput): ReturnType<SignerBtc['signPsbt']> {
  return fakeSignerAction(signatures);
}

function readPsbt(rawPsbt: Uint8Array) {
  return Psbt.fromBuffer(Buffer.from(rawPsbt));
}

function partialSigPublicKeys(rawPsbt: Uint8Array, inputIndex: number) {
  return readPsbt(rawPsbt).data.inputs[inputIndex]?.partialSig?.map(sig => bytesToHex(sig.pubkey));
}

describe(createLedgerBitcoinSigner.name, () => {
  describe('getMasterFingerprint', () => {
    test('reads the master fingerprint from the device as hex', async () => {
      const { hardwareSigner } = makeSigner();

      await expect(hardwareSigner.getMasterFingerprint(makeFakeOperationContext())).resolves.toBe(
        masterFingerprintHex
      );
    });
  });

  describe('requestAccountKeys', () => {
    test('requests native segwit keys, then taproot keys, for each account', async () => {
      const { hardwareSigner, signer } = makeSigner();
      const onRequestKey = vi.fn();

      const { fingerprint, keys } = await hardwareSigner.requestAccountKeys(
        { network: 'mainnet', accountIndexes: [0, 1], onRequestKey },
        makeFakeOperationContext()
      );

      expect(fingerprint).toBe(masterFingerprintHex);
      expect(onRequestKey.mock.calls).toEqual([
        [{ standard: 'p2wpkh', accountIndex: 0 }],
        [{ standard: 'p2wpkh', accountIndex: 1 }],
        [{ standard: 'p2tr', accountIndex: 0 }],
        [{ standard: 'p2tr', accountIndex: 1 }],
      ]);
      expect(signer.getExtendedPublicKey.mock.calls.map(([path]) => path)).toEqual([
        "84'/0'/0'",
        "84'/0'/1'",
        "86'/0'/0'",
        "86'/0'/1'",
      ]);
      expect(keys[0]).toEqual({
        standard: 'p2wpkh',
        accountIndex: 0,
        path: "m/84'/0'/0'",
        xpub: "xpub-84'/0'/0'",
        policy: `[${masterFingerprintHex}/84'/0'/0']xpub-84'/0'/0'`,
      });
      expect(keys[3]).toMatchObject({
        standard: 'p2tr',
        accountIndex: 1,
        policy: `[${masterFingerprintHex}/86'/0'/1']xpub-86'/0'/1'`,
      });
    });

    test('uses the testnet coin type on testnet', async () => {
      const { hardwareSigner } = makeSigner();

      const { keys } = await hardwareSigner.requestAccountKeys(
        { network: 'testnet', accountIndexes: [0] },
        makeFakeOperationContext()
      );

      expect(keys.map(key => key.path)).toEqual(["m/84'/1'/0'", "m/86'/1'/0'"]);
    });
  });

  describe('signPsbt with default wallets', () => {
    test('adds the bip32 derivation and merges the native segwit signature', async () => {
      const tx = buildPsbt([nativeSegwitInput(nativeSegwitPath)]);
      const signature = signNativeSegwitInput(tx, 0, deriveKey(nativeSegwitPath));
      let derivationsAtSignTime: unknown;
      const { hardwareSigner, signer } = makeSigner({
        signPsbt(_wallet, psbtBase64) {
          derivationsAtSignTime = readSignerPsbt(psbtBase64).data.inputs[0]?.bip32Derivation;
          return signedPsbtAction([signature]);
        },
      });
      const ctx = makeFakeOperationContext();

      const signed = await hardwareSigner.signPsbt(
        {
          psbt: tx.toPSBT(),
          network: 'mainnet',
          inputsToSign: [
            {
              index: 0,
              derivationPath: nativeSegwitPath,
              publicKey: derivePublicKey(nativeSegwitPath),
            },
          ],
        },
        ctx
      );

      expect(derivationsAtSignTime).toEqual([
        {
          masterFingerprint: hexToBytes(masterFingerprintHex),
          pubkey: derivePublicKey(nativeSegwitPath),
          path: nativeSegwitPath,
        },
      ]);
      const [wallet] = signer.signPsbt.mock.calls[0];
      expect(wallet).toBeInstanceOf(DefaultWallet);
      expect(wallet).toMatchObject({
        derivationPath: "84'/0'/0'",
        template: DefaultDescriptorTemplate.NATIVE_SEGWIT,
      });
      expect(partialSigPublicKeys(signed, 0)).toEqual([bytesToHex(signature.pubkey)]);
      expect(ctx.onInteraction).toHaveBeenCalledWith({ type: 'confirm-on-device' });
    });

    test('adds the taproot derivation and the key-path signature', async () => {
      const tx = buildPsbt([taprootInput(taprootPath)]);
      const tapKeySig = new Uint8Array(64).fill(9);
      let tapDerivationsAtSignTime: unknown;
      const { hardwareSigner, signer } = makeSigner({
        signPsbt(_wallet, psbtBase64) {
          tapDerivationsAtSignTime = readSignerPsbt(psbtBase64).data.inputs[0]?.tapBip32Derivation;
          return signedPsbtAction([
            { inputIndex: 0, pubkey: derivePublicKey(taprootPath), signature: tapKeySig },
          ]);
        },
      });

      const signed = await hardwareSigner.signPsbt(
        {
          psbt: tx.toPSBT(),
          network: 'mainnet',
          inputsToSign: [
            { index: 0, derivationPath: taprootPath, publicKey: derivePublicKey(taprootPath) },
          ],
        },
        makeFakeOperationContext()
      );

      expect(tapDerivationsAtSignTime).toEqual([
        {
          masterFingerprint: hexToBytes(masterFingerprintHex),
          pubkey: ecdsaPublicKeyToSchnorr(derivePublicKey(taprootPath)),
          path: taprootPath,
          leafHashes: [],
        },
      ]);
      expect(signer.signPsbt.mock.calls[0][0]).toMatchObject({
        derivationPath: "86'/0'/0'",
        template: DefaultDescriptorTemplate.TAPROOT,
      });
      expect(bytesToHex(requireDefined(readPsbt(signed).data.inputs[0]?.tapKeySig))).toBe(
        bytesToHex(tapKeySig)
      );
    });

    test('skips derivations the PSBT already carries', async () => {
      const tx = buildPsbt([nativeSegwitInput(nativeSegwitPath)]);
      tx.updateInput(0, {
        bip32Derivation: [
          [
            derivePublicKey(nativeSegwitPath),
            { fingerprint: 0xdeadbeef, path: btc.bip32Path(nativeSegwitPath) },
          ],
        ],
      });
      let derivationCountAtSignTime: number | undefined;
      const { hardwareSigner } = makeSigner({
        signPsbt(_wallet, psbtBase64) {
          derivationCountAtSignTime =
            readSignerPsbt(psbtBase64).data.inputs[0]?.bip32Derivation?.length;
          return signedPsbtAction([]);
        },
      });

      await hardwareSigner.signPsbt(
        {
          psbt: tx.toPSBT(),
          network: 'mainnet',
          inputsToSign: [
            {
              index: 0,
              derivationPath: nativeSegwitPath,
              publicKey: derivePublicKey(nativeSegwitPath),
            },
          ],
        },
        makeFakeOperationContext()
      );

      expect(derivationCountAtSignTime).toBe(1);
    });

    test('adds the account derivation alongside a co-signer derivation', async () => {
      const tx = buildPsbt([nativeSegwitInput(nativeSegwitPath)]);
      tx.updateInput(0, {
        bip32Derivation: [
          [
            requireDefined(cosignerAddressIndexKey.publicKey),
            { fingerprint: 0x55667788, path: btc.bip32Path("m/48'/0'/0'/2'/0/0") },
          ],
        ],
      });
      let derivationKeysAtSignTime: string[] | undefined;
      const { hardwareSigner } = makeSigner({
        signPsbt(_wallet, psbtBase64) {
          derivationKeysAtSignTime = readSignerPsbt(
            psbtBase64
          ).data.inputs[0]?.bip32Derivation?.map(entry => bytesToHex(entry.pubkey));
          return signedPsbtAction([]);
        },
      });

      await hardwareSigner.signPsbt(
        {
          psbt: tx.toPSBT(),
          network: 'mainnet',
          inputsToSign: [
            {
              index: 0,
              derivationPath: nativeSegwitPath,
              publicKey: derivePublicKey(nativeSegwitPath),
            },
          ],
        },
        makeFakeOperationContext()
      );

      expect(derivationKeysAtSignTime).toEqual(
        expect.arrayContaining([
          bytesToHex(requireDefined(cosignerAddressIndexKey.publicKey)),
          bytesToHex(derivePublicKey(nativeSegwitPath)),
        ])
      );
      expect(derivationKeysAtSignTime).toHaveLength(2);
    });

    test('signs taproot inputs first, then each native segwit account once', async () => {
      const tx = buildPsbt([
        nativeSegwitInput(nativeSegwitPath),
        taprootInput(taprootPath),
        nativeSegwitInput(secondAccountNativeSegwitPath),
        nativeSegwitInput(nativeSegwitPath),
      ]);
      const { hardwareSigner, signer } = makeSigner();

      await hardwareSigner.signPsbt(
        {
          psbt: tx.toPSBT(),
          network: 'mainnet',
          inputsToSign: [
            {
              index: 0,
              derivationPath: nativeSegwitPath,
              publicKey: derivePublicKey(nativeSegwitPath),
            },
            { index: 1, derivationPath: taprootPath, publicKey: derivePublicKey(taprootPath) },
            {
              index: 2,
              derivationPath: secondAccountNativeSegwitPath,
              publicKey: derivePublicKey(secondAccountNativeSegwitPath),
            },
            {
              index: 3,
              derivationPath: nativeSegwitPath,
              publicKey: derivePublicKey(nativeSegwitPath),
            },
          ],
        },
        makeFakeOperationContext()
      );

      expect(
        signer.signPsbt.mock.calls.map(([wallet]) =>
          wallet instanceof DefaultWallet ? wallet.derivationPath : null
        )
      ).toEqual(["86'/0'/0'", "84'/0'/0'", "84'/0'/1'"]);
    });

    test('rejects inputs that no default wallet can sign', async () => {
      const tx = buildPsbt([nativeSegwitInput(nativeSegwitPath)]);
      const { hardwareSigner, signer } = makeSigner();
      const legacyPath = "m/44'/0'/0'/0/0";

      await expect(
        hardwareSigner.signPsbt(
          {
            psbt: tx.toPSBT(),
            network: 'mainnet',
            inputsToSign: [
              { index: 0, derivationPath: legacyPath, publicKey: derivePublicKey(legacyPath) },
            ],
          },
          makeFakeOperationContext()
        )
      ).rejects.toMatchObject({ kind: 'unsupported' });
      expect(signer.signPsbt).not.toHaveBeenCalled();
    });

    test('maps a refusal on the device to a rejected error', async () => {
      const tx = buildPsbt([nativeSegwitInput(nativeSegwitPath)]);
      const { hardwareSigner } = makeSigner({
        signPsbt() {
          const refused: SignPsbtState = {
            status: DeviceActionStatus.Error,
            error: new GlobalCommandError({
              errorCode: '5501',
              message: 'Action refused on device',
            }),
          };
          return { observable: of(refused), cancel: vi.fn() };
        },
      });

      await expect(
        hardwareSigner.signPsbt(
          {
            psbt: tx.toPSBT(),
            network: 'mainnet',
            inputsToSign: [
              {
                index: 0,
                derivationPath: nativeSegwitPath,
                publicKey: derivePublicKey(nativeSegwitPath),
              },
            ],
          },
          makeFakeOperationContext()
        )
      ).rejects.toMatchObject({ kind: 'rejected' });
    });
  });

  describe('signPsbt with a wallet policy', () => {
    const accountPublicKey = requireDefined(accountAddressIndexKey.publicKey);
    const inputsToSign = [
      { index: 0, derivationPath: nativeSegwitPath, publicKey: accountPublicKey },
    ];

    function signWithPolicy(signWith: HDKey[]) {
      const tx = buildPsbt([descriptorInput()]);
      for (const key of signWith) tx.signIdx(requireDefined(key.privateKey), 0);
      const deviceSignature = signNativeSegwitInput(
        buildPsbt([descriptorInput()]),
        0,
        accountAddressIndexKey
      );
      let partialSigsAtSignTime: string[] | undefined;
      const { hardwareSigner, signer } = makeSigner({
        signPsbt(_wallet, psbtBase64) {
          partialSigsAtSignTime = readSignerPsbt(psbtBase64).data.inputs[0]?.partialSig?.map(sig =>
            bytesToHex(sig.pubkey)
          );
          return signedPsbtAction([deviceSignature]);
        },
      });
      const ctx = makeFakeOperationContext();
      const signing = hardwareSigner.signPsbt(
        { psbt: tx.toPSBT(), network: 'mainnet', inputsToSign, policyDescriptor },
        ctx
      );
      return { signing, signer, ctx, partialSigsAtSignTime: () => partialSigsAtSignTime };
    }

    test('registers the Leather policy and signs with the registered wallet', async () => {
      const { signing, signer } = signWithPolicy([]);

      const signed = await signing;

      const [policy] = signer.registerWallet.mock.calls[0];
      expect(policy).toBeInstanceOf(WalletPolicy);
      expect(policy).toMatchObject({
        name: 'Leather',
        descriptorTemplate: 'wsh(multi(2,@0/**,@1/**))',
        keys: [cosignerXpub, `[${accountKeyOrigin}]${accountKeychain.publicExtendedKey}`],
      });
      const [wallet] = signer.signPsbt.mock.calls[0];
      expect(wallet).toBeInstanceOf(RegisteredWallet);
      expect(wallet).toMatchObject({ hmac: registeredPolicyHmac });
      expect(partialSigPublicKeys(signed, 0)).toEqual([bytesToHex(accountPublicKey)]);
    });

    test('strips the stale account signature and keeps the co-signer signature', async () => {
      const { signing, partialSigsAtSignTime } = signWithPolicy([
        accountAddressIndexKey,
        cosignerAddressIndexKey,
      ]);

      const signed = await signing;

      expect(partialSigsAtSignTime()).toEqual([
        bytesToHex(requireDefined(cosignerAddressIndexKey.publicKey)),
      ]);
      expect(partialSigPublicKeys(signed, 0)).toEqual(
        expect.arrayContaining([
          bytesToHex(accountPublicKey),
          bytesToHex(requireDefined(cosignerAddressIndexKey.publicKey)),
        ])
      );
    });

    test('removes the partialSig field when only the account had signed', async () => {
      const { signing, partialSigsAtSignTime } = signWithPolicy([accountAddressIndexKey]);

      await signing;

      expect(partialSigsAtSignTime()).toBeUndefined();
    });

    test('reports the policy approval, then the signing confirmation', async () => {
      const { signer, hardwareSigner } = makeSigner();
      signer.registerWallet.mockImplementation(policy => {
        const awaitingApproval: RegisterWalletState = {
          status: DeviceActionStatus.Pending,
          intermediateValue: {
            requiredUserInteraction: UserInteractionRequired.RegisterWallet,
          },
        };
        const registered: RegisterWalletState = {
          status: DeviceActionStatus.Completed,
          output: new RegisteredWallet(
            policy.name,
            policy.descriptorTemplate,
            policy.keys,
            registeredPolicyHmac
          ),
        };
        return { observable: of(awaitingApproval, registered), cancel: vi.fn() };
      });
      const ctx = makeFakeOperationContext();

      await hardwareSigner.signPsbt(
        {
          psbt: buildPsbt([descriptorInput()]).toPSBT(),
          network: 'mainnet',
          inputsToSign,
          policyDescriptor,
        },
        ctx
      );

      expect(ctx.onInteraction).toHaveBeenNthCalledWith(1, { type: 'approve-policy' });
      expect(ctx.onInteraction).toHaveBeenLastCalledWith({ type: 'confirm-on-device' });
    });

    test('rejects a policy the connected device is absent from', async () => {
      const { hardwareSigner } = makeSigner();
      const foreignDescriptor = `wsh(multi(2,${cosignerXpub}/0/0,${accountKeychain.publicExtendedKey}/0/0))`;

      await expect(
        hardwareSigner.signPsbt(
          {
            psbt: buildPsbt([descriptorInput()]).toPSBT(),
            network: 'mainnet',
            inputsToSign,
            policyDescriptor: foreignDescriptor,
          },
          makeFakeOperationContext()
        )
      ).rejects.toMatchObject({
        kind: 'unknown',
        message: 'The connected Ledger is absent from this descriptor',
      });
    });
  });

  describe('showAddress', () => {
    test('displays the receive address of a default wallet', async () => {
      const { hardwareSigner, signer } = makeSigner();
      const ctx = makeFakeOperationContext();

      await expect(
        hardwareSigner.showAddress(
          { type: 'default', network: 'mainnet', standard: 'p2tr', accountIndex: 2 },
          ctx
        )
      ).resolves.toBe('bc1qdeviceaddress');

      const [wallet, addressIndex, options] = signer.getWalletAddress.mock.calls[0];
      expect(wallet).toMatchObject({
        derivationPath: "86'/0'/2'",
        template: DefaultDescriptorTemplate.TAPROOT,
      });
      expect(addressIndex).toBe(0);
      expect(options).toEqual({ checkOnDevice: true, change: false, skipOpenApp: true });
      expect(ctx.onInteraction).toHaveBeenCalledWith({ type: 'verify-address' });
    });

    test('registers the policy and displays the address at the descriptor key path', async () => {
      const { hardwareSigner, signer } = makeSigner();
      const vaultDescriptor = `wsh(multi(2,${cosignerXpub}/1/7,[${accountKeyOrigin}]${accountKeychain.publicExtendedKey}/1/7))`;
      const ctx = makeFakeOperationContext();

      await hardwareSigner.showAddress(
        { type: 'policy', network: 'mainnet', policyDescriptor: vaultDescriptor },
        ctx
      );

      expect(signer.registerWallet).toHaveBeenCalledOnce();
      const [wallet, addressIndex, options] = signer.getWalletAddress.mock.calls[0];
      expect(wallet).toBeInstanceOf(RegisteredWallet);
      expect(addressIndex).toBe(7);
      expect(options).toMatchObject({ change: true });
      expect(ctx.onInteraction).toHaveBeenLastCalledWith({ type: 'verify-address' });
    });
  });
});
