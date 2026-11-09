import type { AccountAddresses } from '@leather.io/models';

import { createCopyAddressOptions } from './copy-address-options';

const id = { fingerprint: 'abc123', accountIndex: 0 };
const nativeSegwitAddress = 'bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh';
const taprootAddress = 'bc1p5d7rjq7g6rdk2yhzks9smlaqtedr4dekq08ge8ztwac72sfr9rusxg3297';
const stxAddress = 'SP2J6ZY48GV1EZ5V2V5RB9MP66SW86PYKKNRV9EJ7';
const policyAddress = 'bc1qrp33g0q5c5txsp9arysrx4k6zdkfs4nce4xj0gdcccefvpysxf3qccfmv3';

describe(createCopyAddressOptions.name, () => {
  test('that it lists all single-sig formats in order with Native SegWit recommended', () => {
    const account: AccountAddresses = {
      id,
      bitcoin: {
        type: 'hd',
        nativeSegwitDescriptor: 'wpkh(xpub)',
        taprootDescriptor: 'tr(xpub)',
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
    expect(options.slice(1).some(option => option.recommended)).toBe(false);
    expect(options[2].badge).toBeUndefined();
  });

  test('that it skips Bitcoin formats without an address', () => {
    const account: AccountAddresses = {
      id,
      bitcoin: {
        type: 'hd',
        nativeSegwitDescriptor: 'wpkh(xpub)',
        taprootDescriptor: 'tr(xpub)',
        zeroIndexNativeSegwitPayerAddress: '',
        zeroIndexTaprootPayerAddress: taprootAddress,
      },
      stacks: { stxAddress },
    };

    expect(createCopyAddressOptions(account).map(option => option.id)).toEqual([
      'btc-taproot',
      'stx',
    ]);
  });

  test('that it lists only Stacks when Bitcoin is absent', () => {
    const options = createCopyAddressOptions({ id, stacks: { stxAddress } });

    expect(options.map(option => option.id)).toEqual(['stx']);
  });

  test('that it lists only the policy address for a fixed-address account', () => {
    const account: AccountAddresses = {
      id,
      bitcoin: { type: 'fixedAddress', address: policyAddress, paymentType: 'p2wsh' },
      stacks: { stxAddress },
    };

    const options = createCopyAddressOptions(account);

    expect(options).toEqual([
      {
        id: 'btc-policy',
        chain: 'bitcoin',
        title: 'Bitcoin',
        badge: 'Policy address',
        address: policyAddress,
      },
    ]);
  });

  test('that it lists nothing when the account has no addresses', () => {
    expect(createCopyAddressOptions({ id })).toEqual([]);
  });
});
