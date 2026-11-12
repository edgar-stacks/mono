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

vi.mock('@app/store/networks/networks.selectors', () => ({
  useCurrentNetwork: () => ({ chain: { bitcoin: { mode: 'mainnet' } } }),
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
  test('shows the address of the wallet policy with the account key carrying its origin', async () => {
    const signer = makeFakeHardwareBitcoinSigner({
      showAddress: vi.fn().mockResolvedValue(deviceAddress),
    });
    const ctx = makeFakeOperationContext();
    const displayAddress = useDisplayLedgerDescriptorAddress();

    await expect(displayAddress(signer, vaultDescriptor, ctx)).resolves.toBe(deviceAddress);

    expect(signer.showAddress).toHaveBeenCalledWith(
      {
        type: 'policy',
        network: 'mainnet',
        policyDescriptor: `wsh(multi(2,${cosignerXpub}/1/7,[${accountKeyOrigin}]${accountKeychain.publicExtendedKey}/1/7))`,
      },
      ctx
    );
  });

  test('fails fast when the account is not part of the descriptor', async () => {
    const signer = makeFakeHardwareBitcoinSigner();
    const otherXpub = makeNativeSegwitAccountKeychain(3).publicExtendedKey;
    const displayAddress = useDisplayLedgerDescriptorAddress();

    await expect(
      displayAddress(
        signer,
        `wsh(multi(2,${cosignerXpub}/0/0,${otherXpub}/0/0))`,
        makeFakeOperationContext()
      )
    ).rejects.toThrow('Current account is not part of this descriptor');
    expect(signer.showAddress).not.toHaveBeenCalled();
  });

  test('fails fast when a co-signer is a raw public key', async () => {
    const rawKey = makeNativeSegwitAccountKeychain(2).deriveChild(0).deriveChild(0).publicKey;
    if (!rawKey) throw new Error('Expected public key');
    const rawKeyDescriptor = `wsh(multi(2,${Buffer.from(rawKey).toString('hex')},${accountKeychain.publicExtendedKey}/0/0))`;
    const signer = makeFakeHardwareBitcoinSigner();
    const displayAddress = useDisplayLedgerDescriptorAddress();

    await expect(
      displayAddress(signer, rawKeyDescriptor, makeFakeOperationContext())
    ).rejects.toThrow('another signer is a raw public key');
    expect(signer.showAddress).not.toHaveBeenCalled();
  });
});
