import { hexToBytes } from '@noble/hashes/utils';
import { HDKey } from '@scure/bip32';
import * as btc from '@scure/btc-signer';

import { compileWshDescriptor } from '@leather.io/bitcoin';
import {
  makeFakeHardwareBitcoinSigner,
  makeFakeOperationContext,
} from '@leather.io/ledger/test-utils';

import { useSignLedgerDescriptorTx } from './use-sign-ledger-descriptor-tx';

const mocks = vi.hoisted(() => ({
  addNonWitnessUtxo: vi.fn(),
  getInputsToSign: vi.fn(),
  loggerWarn: vi.fn(),
}));

vi.mock('@shared/logger', () => ({
  logger: { warn: mocks.loggerWarn },
}));

vi.mock('@app/features/ledger/hooks/use-hardware-bitcoin-inputs-to-sign', () => ({
  useHardwareBitcoinInputsToSign: () => mocks.getInputsToSign,
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

function requireDefined<T>(value: T | null | undefined): T {
  if (value === null || value === undefined) throw new Error('Expected value to be defined');
  return value;
}

function makeNativeSegwitAccountKeychain(seedByte: number) {
  return HDKey.fromMasterSeed(new Uint8Array(32).fill(seedByte)).derive("m/84'/0'/0'");
}

const masterFingerprintHex = 'deadbeef';
const accountKeyOrigin = `${masterFingerprintHex}/84'/0'/0'`;
const accountKeychain = makeNativeSegwitAccountKeychain(1);
const cosignerXpub = makeNativeSegwitAccountKeychain(2).publicExtendedKey;
const multiSigDescriptor = `wsh(multi(2,${cosignerXpub}/0/0,${accountKeychain.publicExtendedKey}/0/0))`;
const signingConfig = [{ index: 0, derivationPath: "m/84'/0'/0'/0/0" }];
const inputsToSign = [
  {
    index: 0,
    derivationPath: "m/84'/0'/0'/0/0",
    publicKey: requireDefined(accountKeychain.deriveChild(0).deriveChild(0).publicKey),
  },
];

function buildDescriptorTx() {
  const { scriptPubKey, witnessScript } = compileWshDescriptor(multiSigDescriptor);
  const tx = new btc.Transaction({ allowUnknownInputs: true });
  tx.addInput({
    txid: hexToBytes('00'.repeat(32)),
    index: 0,
    witnessUtxo: { script: scriptPubKey, amount: 20_000n },
    witnessScript,
  });
  tx.addOutput({
    script: btc.p2wpkh(
      requireDefined(makeNativeSegwitAccountKeychain(3).deriveChild(0).deriveChild(0).publicKey)
    ).script,
    amount: 18_000n,
  });
  return tx;
}

function anyBytes(): unknown {
  return expect.any(Uint8Array);
}

describe(useSignLedgerDescriptorTx.name, () => {
  let signTx: ReturnType<typeof useSignLedgerDescriptorTx>;

  beforeEach(() => {
    vi.clearAllMocks();
    mocks.addNonWitnessUtxo.mockResolvedValue(undefined);
    mocks.getInputsToSign.mockReturnValue(inputsToSign);
    signTx = useSignLedgerDescriptorTx();
  });

  function setup() {
    const signPsbt = vi.fn().mockResolvedValue(buildDescriptorTx().toPSBT());
    const signer = makeFakeHardwareBitcoinSigner({ signPsbt });
    const ctx = makeFakeOperationContext();
    const rawPsbt = buildDescriptorTx().toPSBT();
    return {
      signPsbt,
      ctx,
      rawPsbt,
      sign: () => signTx(signer, rawPsbt, multiSigDescriptor, signingConfig, ctx),
    };
  }

  test('signs through the wallet policy with the account key carrying its origin', async () => {
    const { signPsbt, ctx, rawPsbt, sign } = setup();

    const signedTx = await sign();

    expect(signedTx).toBeInstanceOf(btc.Transaction);
    expect(mocks.getInputsToSign).toHaveBeenCalledWith(rawPsbt, signingConfig);
    expect(signPsbt).toHaveBeenCalledWith(
      {
        psbt: anyBytes(),
        network: 'mainnet',
        inputsToSign,
        policyDescriptor: `wsh(multi(2,${cosignerXpub}/0/0,[${accountKeyOrigin}]${accountKeychain.publicExtendedKey}/0/0))`,
      },
      ctx
    );
    expect(mocks.addNonWitnessUtxo).toHaveBeenCalledWith(expect.anything(), signingConfig);
  });

  test('still signs when adding the non-witness utxo fails', async () => {
    mocks.addNonWitnessUtxo.mockRejectedValue(new Error('tx hex lookup failed'));
    const { signPsbt, sign } = setup();

    await sign();

    expect(mocks.loggerWarn).toHaveBeenCalledWith(
      'Failed to add non-witness UTXO; Ledger will sign with unverified inputs warning'
    );
    expect(signPsbt).toHaveBeenCalledOnce();
  });

  test('refuses a descriptor the current account is not part of', async () => {
    const strangerDescriptor = `wsh(multi(1,${cosignerXpub}/0/0))`;
    const signPsbt = vi.fn();

    await expect(
      signTx(
        makeFakeHardwareBitcoinSigner({ signPsbt }),
        buildDescriptorTx().toPSBT(),
        strangerDescriptor,
        signingConfig,
        makeFakeOperationContext()
      )
    ).rejects.toThrow('Current account is not part of this descriptor');
    expect(signPsbt).not.toHaveBeenCalled();
  });
});
