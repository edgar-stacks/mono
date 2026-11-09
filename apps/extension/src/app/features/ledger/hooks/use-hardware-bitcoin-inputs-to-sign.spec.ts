import { hexToBytes } from '@noble/hashes/utils';
import { HDKey } from '@scure/bip32';
import * as btc from '@scure/btc-signer';

import { useHardwareBitcoinInputsToSign } from './use-hardware-bitcoin-inputs-to-sign';

const mocks = vi.hoisted(() => ({
  createNativeSegwitPayer: vi.fn(),
  createTaprootPayer: vi.fn(),
}));

vi.mock('@app/store/accounts/blockchain/bitcoin/native-segwit-account.hooks', () => ({
  useCurrentAccountNativeSegwitPayer: () => mocks.createNativeSegwitPayer,
}));

vi.mock('@app/store/accounts/blockchain/bitcoin/taproot-account.hooks', () => ({
  useCurrentAccountTaprootPayer: () => mocks.createTaprootPayer,
}));

function requireDefined<T>(value: T | null | undefined): T {
  if (value === null || value === undefined) throw new Error('Expected value to be defined');
  return value;
}

const rootKey = HDKey.fromMasterSeed(new Uint8Array(32).fill(1));
const nativeSegwitPublicKey = requireDefined(rootKey.derive("m/84'/0'/0'/0/3").publicKey);
const taprootPublicKey = requireDefined(rootKey.derive("m/86'/0'/0'/1/2").publicKey);

function buildPsbt() {
  const tx = new btc.Transaction();
  tx.addInput({
    txid: hexToBytes('00'.repeat(32)),
    index: 0,
    witnessUtxo: { script: btc.p2wpkh(nativeSegwitPublicKey).script, amount: 1_000n },
  });
  tx.addInput({
    txid: hexToBytes('11'.repeat(32)),
    index: 0,
    witnessUtxo: { script: btc.p2tr(taprootPublicKey.slice(1)).script, amount: 1_000n },
  });
  return tx.toPSBT();
}

describe(useHardwareBitcoinInputsToSign.name, () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.createNativeSegwitPayer.mockReturnValue({ publicKey: nativeSegwitPublicKey });
    mocks.createTaprootPayer.mockReturnValue({ publicKey: taprootPublicKey });
  });

  test('resolves each input public key from the payer of its payment type and path', () => {
    const getInputsToSign = useHardwareBitcoinInputsToSign();

    const inputsToSign = getInputsToSign(buildPsbt(), [
      { index: 0, derivationPath: "m/84'/0'/0'/0/3" },
      { index: 1, derivationPath: "m/86'/0'/0'/1/2" },
    ]);

    expect(inputsToSign).toEqual([
      { index: 0, derivationPath: "m/84'/0'/0'/0/3", publicKey: nativeSegwitPublicKey },
      { index: 1, derivationPath: "m/86'/0'/0'/1/2", publicKey: taprootPublicKey },
    ]);
    expect(mocks.createNativeSegwitPayer).toHaveBeenCalledWith({ changeIndex: 0, addressIndex: 3 });
    expect(mocks.createTaprootPayer).toHaveBeenCalledWith({ changeIndex: 1, addressIndex: 2 });
  });

  test('throws when the account has no payer for the input', () => {
    mocks.createNativeSegwitPayer.mockReturnValue(undefined);
    const getInputsToSign = useHardwareBitcoinInputsToSign();

    expect(() =>
      getInputsToSign(buildPsbt(), [{ index: 0, derivationPath: "m/84'/0'/0'/0/3" }])
    ).toThrow("Unable to resolve the public key for path m/84'/0'/0'/0/3");
  });
});
