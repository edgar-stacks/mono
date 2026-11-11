import type { AccountAddresses } from '@leather.io/models';

import { createCopyAddressOptions } from './copy-address-options';

const id = { fingerprint: 'abcd1234', accountIndex: 0 };
const nativeSegwitAddress = 'bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh';
const taprootAddress = 'bc1p5d7rjq7g6rdk2yhzks9smlaqtedr4dekq08ge8ztwac72sfr9rusxg3297';
const stxAddress = 'SP2J6ZY48GV1EZ5V2V5RB9MP66SW86PYKKNRV9EJ7';
const policyAddress = 'bc1qrp33g0q5c5txsp9arysrx4k6zdkfs4nce4xj0gdcccefvpysxf3qccfmv3';

describe(createCopyAddressOptions.name, () => {
  it('lists Native SegWit, Taproot and Stacks in order with Native SegWit recommended', () => {
    const account: AccountAddresses = {
      id,
      bitcoin: {
        type: 'hd',
        nativeSegwitDescriptor: 'wpkh(...)',
        taprootDescriptor: 'tr(...)',
        zeroIndexNativeSegwitPayerAddress: nativeSegwitAddress,
        zeroIndexTaprootPayerAddress: taprootAddress,
      },
      stacks: { stxAddress },
    };

    const options = createCopyAddressOptions(account);

    expect(options.map(option => option.id)).toEqual(['btc-native-segwit', 'btc-taproot', 'stx']);
    expect(options.map(option => option.address)).toEqual([
      nativeSegwitAddress,
      taprootAddress,
      stxAddress,
    ]);
    expect(options[0].recommended).toBe(true);
    expect(options[1].recommended).toBeUndefined();
    expect(options[2].badge).toBeUndefined();
  });

  it('lists only Stacks when Bitcoin is absent', () => {
    const options = createCopyAddressOptions({ id, stacks: { stxAddress } });

    expect(options.map(option => option.id)).toEqual(['stx']);
  });

  it('lists only the policy address for a fixed-address account', () => {
    const options = createCopyAddressOptions({
      id,
      bitcoin: { type: 'fixedAddress', address: policyAddress, paymentType: 'p2wsh' },
    });

    expect(options).toEqual([
      {
        id: 'btc-policy',
        title: 'Bitcoin',
        address: policyAddress,
        badge: 'Policy address',
      },
    ]);
  });

  it('returns no options when the account has no addresses', () => {
    expect(createCopyAddressOptions({ id })).toEqual([]);
  });
});
