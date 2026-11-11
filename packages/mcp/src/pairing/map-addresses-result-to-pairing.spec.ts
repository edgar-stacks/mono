import { mapAddressesResultToPairing } from './map-addresses-result-to-pairing';

const nativeSegwitAddress = {
  symbol: 'BTC',
  type: 'p2wpkh',
  address: 'bc1qcr8te4kr609gcawutmrza0j4xv80jy8z306fyu',
  publicKey: '02aa',
  derivationPath: "m/84'/0'/2'/0/0",
  descriptor: 'wpkh(xpubNativeSegwit)',
  fingerprint: '73c5da0a',
};

const taprootAddress = {
  symbol: 'BTC',
  type: 'p2tr',
  address: 'bc1p5cyxnuxmeuwuvkwfem96lqzszd02n6xdcjrs20cac6yqjjwudpxqkedrcr',
  publicKey: '03bb',
  tweakedPublicKey: 'cc',
  derivationPath: "m/86'/0'/2'/0/0",
  descriptor: 'tr(xpubTaproot)',
  fingerprint: '73c5da0a',
};

const stacksAddress = {
  symbol: 'STX',
  kind: 'single-sig',
  address: 'SP2J6ZY48GV1EZ5V2V5RB9MP66SW86PYKKNRV9EJ7',
  publicKey: '02dd',
};

describe(mapAddressesResultToPairing.name, () => {
  test('maps a single-sig account to hd bitcoin descriptors and a stacks address', () => {
    const pairing = mapAddressesResultToPairing({
      addresses: [nativeSegwitAddress, taprootAddress, stacksAddress],
    });

    expect(pairing).toEqual({
      id: { fingerprint: '73c5da0a', accountIndex: 2 },
      bitcoin: {
        type: 'hd',
        nativeSegwitDescriptor: 'wpkh(xpubNativeSegwit)',
        taprootDescriptor: 'tr(xpubTaproot)',
        zeroIndexNativeSegwitPayerAddress: nativeSegwitAddress.address,
        zeroIndexTaprootPayerAddress: taprootAddress.address,
      },
      stacks: { stxAddress: stacksAddress.address },
    });
  });

  test('maps a bitcoin multisig policy to a fixed p2wsh address', () => {
    const pairing = mapAddressesResultToPairing({
      addresses: [
        {
          symbol: 'BTC',
          type: 'p2wsh',
          address: 'bc1qwqdg6squsna38e46795at95yu9atm8azzmyvckulcc7kytlcckxswvvzej',
          descriptor: 'wsh(multi(2,a,b))',
        },
      ],
    });

    expect(pairing).toEqual({
      id: { fingerprint: 'unknown', accountIndex: 0 },
      bitcoin: {
        type: 'fixedAddress',
        address: 'bc1qwqdg6squsna38e46795at95yu9atm8azzmyvckulcc7kytlcckxswvvzej',
        paymentType: 'p2wsh',
      },
    });
  });

  test('keeps the stacks address when bitcoin descriptors are missing', () => {
    const pairing = mapAddressesResultToPairing({
      addresses: [{ ...nativeSegwitAddress, descriptor: '' }, stacksAddress],
    });

    expect(pairing).toEqual({
      id: { fingerprint: '73c5da0a', accountIndex: 2 },
      stacks: { stxAddress: stacksAddress.address },
    });
  });

  test('returns null for a result without addresses', () => {
    expect(mapAddressesResultToPairing({ addresses: [] })).toBeNull();
  });

  test('returns null for a result that does not match the getAddresses schema', () => {
    expect(mapAddressesResultToPairing({ addresses: [{ symbol: 'ETH' }] })).toBeNull();
    expect(mapAddressesResultToPairing(undefined)).toBeNull();
  });
});
