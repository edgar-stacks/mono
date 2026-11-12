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

const nativeSegwitPublicKey = new Uint8Array(33).fill(2);
const taprootPublicKey = new Uint8Array(33).fill(3);

beforeEach(() => {
  mocks.createNativeSegwitPayer.mockReset();
  mocks.createTaprootPayer.mockReset();
  mocks.createNativeSegwitPayer.mockReturnValue({ publicKey: nativeSegwitPublicKey });
  mocks.createTaprootPayer.mockReturnValue({ publicKey: taprootPublicKey });
});

describe(useHardwareBitcoinInputsToSign.name, () => {
  test('resolves the public key of each input from the payer of its derivation path', () => {
    const resolveInputsToSign = useHardwareBitcoinInputsToSign();

    expect(
      resolveInputsToSign([
        { index: 0, derivationPath: "m/84'/0'/0'/0/3" },
        { index: 1, derivationPath: "m/86'/0'/0'/1/5" },
      ])
    ).toEqual([
      { index: 0, derivationPath: "m/84'/0'/0'/0/3", publicKey: nativeSegwitPublicKey },
      { index: 1, derivationPath: "m/86'/0'/0'/1/5", publicKey: taprootPublicKey },
    ]);
    expect(mocks.createNativeSegwitPayer).toHaveBeenCalledWith({ changeIndex: 0, addressIndex: 3 });
    expect(mocks.createTaprootPayer).toHaveBeenCalledWith({ changeIndex: 1, addressIndex: 5 });
  });

  test('throws when the account has no payer for the path', () => {
    mocks.createNativeSegwitPayer.mockReturnValue(undefined);
    const resolveInputsToSign = useHardwareBitcoinInputsToSign();

    expect(() => resolveInputsToSign([{ index: 0, derivationPath: "m/84'/0'/0'/0/0" }])).toThrow(
      "Unable to resolve the public key for path m/84'/0'/0'/0/0"
    );
  });
});
