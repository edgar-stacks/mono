import { hexToBytes } from '@noble/hashes/utils';
import { HDKey } from '@scure/bip32';
import * as btc from '@scure/btc-signer';

import { compileWshDescriptor } from '@leather.io/bitcoin';
import type { OperationContext, SignBitcoinPsbtArgs } from '@leather.io/ledger';
import { makeFakeHardwareBitcoinSigner } from '@leather.io/ledger/test-utils';

import { type BitcoinInputSigningConfig } from '@shared/crypto/bitcoin/signer-config';

import { useSignLedgerDescriptorTx } from './use-sign-ledger-descriptor-tx';

const mocks = vi.hoisted(() => ({
  addNonWitnessUtxo: vi.fn(),
  loggerWarn: vi.fn(),
  toDeviceBusyStep: vi.fn(),
  toAwaitingDeviceOperation: vi.fn(),
}));

vi.mock('@shared/logger', () => ({
  logger: { warn: mocks.loggerWarn },
}));

vi.mock('@app/features/ledger/flow/ledger-flow.context', () => ({
  useLedgerSteps: () => ({
    toDeviceBusyStep: mocks.toDeviceBusyStep,
    toAwaitingDeviceOperation: mocks.toAwaitingDeviceOperation,
  }),
}));

vi.mock('@app/features/ledger/hooks/use-hardware-bitcoin-inputs-to-sign', () => ({
  useHardwareBitcoinInputsToSign: () => (inputsToSign: BitcoinInputSigningConfig[]) =>
    inputsToSign.map(input => ({ ...input, publicKey: accountAddressIndexPublicKey })),
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

const accountKeyOrigin = `deadbeef/84'/0'/0'`;
const accountKeychain = makeNativeSegwitAccountKeychain(1);
const accountAddressIndexPublicKey = requireDefined(
  accountKeychain.deriveChild(0).deriveChild(0).publicKey
);
const cosignerXpub = makeNativeSegwitAccountKeychain(2).publicExtendedKey;
const multiSigDescriptor = `wsh(multi(2,${cosignerXpub}/0/0,${accountKeychain.publicExtendedKey}/0/0))`;
const signingConfig = [{ index: 0, derivationPath: "m/84'/0'/0'/0/0" }];

function buildDescriptorTx() {
  const { scriptPubKey, witnessScript } = compileWshDescriptor(multiSigDescriptor);
  const tx = new btc.Transaction({ allowUnknownInputs: true });
  tx.addInput({
    txid: hexToBytes('00'.repeat(32)),
    index: 0,
    witnessUtxo: { script: scriptPubKey, amount: 20_000n },
    witnessScript,
  });
  tx.addOutput({ script: scriptPubKey, amount: 18_000n });
  return tx;
}

function makeSigner() {
  return makeFakeHardwareBitcoinSigner({
    signPsbt: vi.fn((args: SignBitcoinPsbtArgs, ctx: OperationContext) => {
      ctx.onInteraction?.({ type: 'approve-policy' });
      ctx.onInteraction?.({ type: 'confirm-on-device' });
      return Promise.resolve(args.psbt);
    }),
  });
}

describe(useSignLedgerDescriptorTx.name, () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.addNonWitnessUtxo.mockResolvedValue(undefined);
  });

  test('signs through the wallet policy with the account key carrying its origin', async () => {
    const signer = makeSigner();
    const controller = new AbortController();
    const signTx = useSignLedgerDescriptorTx();

    const signedTx = await signTx(
      signer,
      { signal: controller.signal },
      buildDescriptorTx().toPSBT(),
      multiSigDescriptor,
      signingConfig
    );

    expect(signedTx).toBeInstanceOf(btc.Transaction);
    expect(signer.signPsbt).toHaveBeenCalledWith(
      expect.objectContaining({
        network: 'mainnet',
        policyDescriptor: `wsh(multi(2,${cosignerXpub}/0/0,[${accountKeyOrigin}]${accountKeychain.publicExtendedKey}/0/0))`,
        inputsToSign: [{ ...signingConfig[0], publicKey: accountAddressIndexPublicKey }],
      }),
      expect.objectContaining({ signal: controller.signal })
    );
  });

  test('shows the policy prompt, then waits for the user to approve on the device', async () => {
    const signTx = useSignLedgerDescriptorTx();

    await signTx(makeSigner(), {}, buildDescriptorTx().toPSBT(), multiSigDescriptor, signingConfig);

    expect(mocks.toDeviceBusyStep).toHaveBeenCalledWith(
      'Approve the Leather wallet policy on your Ledger…'
    );
    expect(mocks.toAwaitingDeviceOperation).toHaveBeenCalledWith({ hasApprovedOperation: false });
  });

  test('still signs when adding the non-witness utxo fails', async () => {
    mocks.addNonWitnessUtxo.mockRejectedValue(new Error('tx hex lookup failed'));
    const signer = makeSigner();
    const signTx = useSignLedgerDescriptorTx();

    await signTx(signer, {}, buildDescriptorTx().toPSBT(), multiSigDescriptor, signingConfig);

    expect(mocks.loggerWarn).toHaveBeenCalledWith(
      'Failed to add non-witness UTXO; Ledger will sign with unverified inputs warning'
    );
    expect(signer.signPsbt).toHaveBeenCalledOnce();
  });

  test('refuses a descriptor the current account is not part of', async () => {
    const signer = makeSigner();
    const foreignDescriptor = `wsh(multi(1,${cosignerXpub}/0/0))`;
    const signTx = useSignLedgerDescriptorTx();

    await expect(
      signTx(signer, {}, buildDescriptorTx().toPSBT(), foreignDescriptor, signingConfig)
    ).rejects.toThrow('Current account is not part of this descriptor');
    expect(signer.signPsbt).not.toHaveBeenCalled();
  });
});
