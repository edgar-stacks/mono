import { HDKey } from '@scure/bip32';

import {
  makeFakeHardwareBitcoinSigner,
  makeFakeOperationContext,
} from '@leather.io/ledger/test-utils';

import { useDisplayLedgerDescriptorAddress } from './use-display-ledger-descriptor-address';

vi.mock('@app/store/accounts/blockchain/bitcoin/native-segwit-account.hooks', () => ({
  useCurrentNativeSegwitAccount: () => ({
    keychain: accountKeychain,
    xpub: accountKeychain.publicExtendedKey,
    keyOrigin: accountKeyOrigin,
  }),
}));

function makeNativeSegwitAccountKeychain(seedByte: number) {
  return HDKey.fromMasterSeed(new Uint8Array(32).fill(seedByte)).derive("m/84'/0'/0'");
}

const masterFingerprintHex = 'deadbeef';
const accountKeyOrigin = `${masterFingerprintHex}/84'/0'/0'`;
const accountKeychain = makeNativeSegwitAccountKeychain(1);
const cosignerXpub = makeNativeSegwitAccountKeychain(2).publicExtendedKey;
const vaultDescriptor = `wsh(multi(2,${cosignerXpub}/1/7,${accountKeychain.publicExtendedKey}/1/7))`;
const deviceAddress = 'bc1qdeviceaddress';

describe(useDisplayLedgerDescriptorAddress.name, () => {
  test('shows the policy address at the descriptor key path index with the account origin', async () => {
    const showAddress = vi.fn().mockResolvedValue(deviceAddress);
    const ctx = makeFakeOperationContext();
    const displayAddress = useDisplayLedgerDescriptorAddress();

    const address = await displayAddress(
      makeFakeHardwareBitcoinSigner({ showAddress }),
      vaultDescriptor,
      ctx
    );

    expect(address).toBe(deviceAddress);
    expect(showAddress).toHaveBeenCalledWith(
      {
        kind: 'policy',
        policyDescriptor: `wsh(multi(2,${cosignerXpub}/1/7,[${accountKeyOrigin}]${accountKeychain.publicExtendedKey}/1/7))`,
        changeIndex: 1,
        addressIndex: 7,
      },
      ctx
    );
  });

  test('fails fast when a co-signer is a raw public key', async () => {
    const rawKey = makeNativeSegwitAccountKeychain(2).deriveChild(0).deriveChild(0).publicKey;
    if (!rawKey) throw new Error('Expected public key');
    const rawKeyDescriptor = `wsh(multi(2,${Buffer.from(rawKey).toString('hex')},${accountKeychain.publicExtendedKey}/0/0))`;
    const showAddress = vi.fn();
    const displayAddress = useDisplayLedgerDescriptorAddress();

    await expect(
      displayAddress(
        makeFakeHardwareBitcoinSigner({ showAddress }),
        rawKeyDescriptor,
        makeFakeOperationContext()
      )
    ).rejects.toThrow('another signer is a raw public key');
    expect(showAddress).not.toHaveBeenCalled();
  });
});
