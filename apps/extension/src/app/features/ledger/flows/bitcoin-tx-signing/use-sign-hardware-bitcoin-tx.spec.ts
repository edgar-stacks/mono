import { hexToBytes } from '@noble/hashes/utils';
import { HDKey } from '@scure/bip32';
import * as btc from '@scure/btc-signer';
import { Psbt } from 'bitcoinjs-lib';

import {
  makeFakeHardwareBitcoinSigner,
  makeFakeOperationContext,
} from '@leather.io/ledger/test-utils';

import { useSignHardwareBitcoinTx } from './use-sign-hardware-bitcoin-tx';

const mocks = vi.hoisted(() => ({
  addNonWitnessUtxo: vi.fn(),
  resolveInputsToSign: vi.fn(),
  loggerWarn: vi.fn(),
  track: vi.fn(),
}));

vi.mock('@shared/logger', () => ({
  logger: { warn: mocks.loggerWarn },
}));

vi.mock('@shared/utils/analytics', () => ({
  analytics: { track: mocks.track },
}));

vi.mock('@app/features/ledger/hardware-wallet/use-hardware-bitcoin-inputs-to-sign', () => ({
  useHardwareBitcoinInputsToSign: () => mocks.resolveInputsToSign,
}));

vi.mock('@app/store/accounts/blockchain/bitcoin/native-segwit-account.hooks', () => ({
  useCurrentNativeSegwitAccount: () => ({
    keychain: accountKeychain,
    xpub: accountKeychain.publicExtendedKey,
    keyOrigin: accountKeyOrigin,
  }),
  useUpdateLedgerSpecificNativeSegwitUtxoHexForAdddressIndexZero: () => mocks.addNonWitnessUtxo,
}));

vi.mock('@app/store/networks/networks.selectors', () => ({
  useCurrentNetwork: () => ({ chain: { bitcoin: { mode: 'mainnet' } } }),
}));

function anyInstanceOf(type: unknown): unknown {
  return expect.any(type);
}

function requireDefined<T>(value: T | null | undefined): T {
  if (value === null || value === undefined) throw new Error('Expected value to be defined');
  return value;
}

function makeNativeSegwitAccountKeychain(seedByte: number) {
  return HDKey.fromMasterSeed(new Uint8Array(32).fill(seedByte)).derive("m/84'/0'/0'");
}

const accountKeyOrigin = `deadbeef/84'/0'/0'`;
const accountKeychain = makeNativeSegwitAccountKeychain(1);
const cosignerXpub = makeNativeSegwitAccountKeychain(2).publicExtendedKey;
const multiSigDescriptor = `wsh(multi(2,${cosignerXpub}/0/0,${accountKeychain.publicExtendedKey}/0/0))`;
const nativeSegwitConfig = { index: 0, derivationPath: "m/84'/0'/0'/0/0" };
const taprootConfig = { index: 1, derivationPath: "m/86'/0'/0'/0/0" };
const resolvedInputs = [
  { ...nativeSegwitConfig, publicKey: new Uint8Array(33).fill(2) },
  { ...taprootConfig, publicKey: new Uint8Array(33).fill(3) },
];

function makePsbt() {
  const tx = new btc.Transaction();
  tx.addInput({
    txid: hexToBytes('11'.repeat(32)),
    index: 0,
    witnessUtxo: {
      script: btc.p2wpkh(requireDefined(accountKeychain.deriveChild(0).deriveChild(0).publicKey))
        .script,
      amount: 20_000n,
    },
  });
  tx.addOutput({
    script: btc.p2wpkh(requireDefined(accountKeychain.deriveChild(0).deriveChild(1).publicKey))
      .script,
    amount: 10_000n,
  });
  return tx.toPSBT();
}

function setup() {
  const signedPsbt = makePsbt();
  const signer = makeFakeHardwareBitcoinSigner({
    signPsbt: vi.fn().mockResolvedValue(signedPsbt),
  });
  return { signer, signedPsbt, ctx: makeFakeOperationContext() };
}

describe(useSignHardwareBitcoinTx.name, () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.addNonWitnessUtxo.mockResolvedValue(undefined);
    mocks.resolveInputsToSign.mockReturnValue(resolvedInputs);
  });

  test('signs with the resolved inputs and returns the signed transaction', async () => {
    const { signer, signedPsbt, ctx } = setup();
    const signTx = useSignHardwareBitcoinTx();

    const signedTx = await signTx(
      signer,
      { psbt: makePsbt(), inputsToSign: [nativeSegwitConfig, taprootConfig] },
      ctx
    );

    expect(mocks.resolveInputsToSign).toHaveBeenCalledWith([nativeSegwitConfig, taprootConfig]);
    expect(signer.signPsbt).toHaveBeenCalledWith(
      {
        psbt: anyInstanceOf(Uint8Array),
        network: 'mainnet',
        inputsToSign: resolvedInputs,
        policyDescriptor: undefined,
      },
      ctx
    );
    expect(signedTx).toBeInstanceOf(btc.Transaction);
    expect(signedTx.toPSBT()).toEqual(btc.Transaction.fromPSBT(signedPsbt).toPSBT());
  });

  test('adds the previous transactions of native segwit inputs only', async () => {
    const { signer, ctx } = setup();
    const signTx = useSignHardwareBitcoinTx();

    await signTx(
      signer,
      { psbt: makePsbt(), inputsToSign: [nativeSegwitConfig, taprootConfig] },
      ctx
    );

    expect(mocks.addNonWitnessUtxo).toHaveBeenCalledWith(expect.any(Psbt), [nativeSegwitConfig]);
    expect(mocks.track).toHaveBeenCalledWith('native_segwit_tx_hex_to_ledger_tx', {
      success: true,
    });
  });

  test('still signs when the previous transactions cannot be added', async () => {
    mocks.addNonWitnessUtxo.mockRejectedValue(new Error('tx hex lookup failed'));
    const { signer, ctx } = setup();
    const signTx = useSignHardwareBitcoinTx();

    await signTx(signer, { psbt: makePsbt(), inputsToSign: [nativeSegwitConfig] }, ctx);

    expect(mocks.track).toHaveBeenCalledWith('native_segwit_tx_hex_to_ledger_tx', {
      success: false,
    });
    expect(signer.signPsbt).toHaveBeenCalledOnce();
  });

  test('signs a descriptor through a wallet policy with the account key carrying its origin', async () => {
    const { signer, ctx } = setup();
    const signTx = useSignHardwareBitcoinTx();

    await signTx(
      signer,
      { psbt: makePsbt(), inputsToSign: [nativeSegwitConfig], descriptor: multiSigDescriptor },
      ctx
    );

    expect(mocks.addNonWitnessUtxo).toHaveBeenCalledWith(expect.any(Psbt), [nativeSegwitConfig]);
    expect(signer.signPsbt).toHaveBeenCalledWith(
      expect.objectContaining({
        policyDescriptor: `wsh(multi(2,${cosignerXpub}/0/0,[${accountKeyOrigin}]${accountKeychain.publicExtendedKey}/0/0))`,
      }),
      ctx
    );
  });

  test('still signs a descriptor when the previous transactions cannot be added', async () => {
    mocks.addNonWitnessUtxo.mockRejectedValue(new Error('tx hex lookup failed'));
    const { signer, ctx } = setup();
    const signTx = useSignHardwareBitcoinTx();

    await signTx(
      signer,
      { psbt: makePsbt(), inputsToSign: [nativeSegwitConfig], descriptor: multiSigDescriptor },
      ctx
    );

    expect(mocks.loggerWarn).toHaveBeenCalledWith(
      'Failed to add non-witness UTXO; Ledger will sign with unverified inputs warning'
    );
    expect(signer.signPsbt).toHaveBeenCalledOnce();
  });

  test('refuses a descriptor the current account is not part of', async () => {
    const { signer, ctx } = setup();
    const signTx = useSignHardwareBitcoinTx();
    const otherXpub = makeNativeSegwitAccountKeychain(3).publicExtendedKey;

    await expect(
      signTx(
        signer,
        {
          psbt: makePsbt(),
          inputsToSign: [nativeSegwitConfig],
          descriptor: `wsh(multi(2,${cosignerXpub}/0/0,${otherXpub}/0/0))`,
        },
        ctx
      )
    ).rejects.toThrow('Current account is not part of this descriptor');
    expect(signer.signPsbt).not.toHaveBeenCalled();
  });
});
