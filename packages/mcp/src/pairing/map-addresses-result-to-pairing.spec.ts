import { mapAddressesResultToPairing } from './map-addresses-result-to-pairing';

const pairedAt = new Date('2026-11-09T10:00:00.000Z');

const nativeSegwit = {
  symbol: 'BTC',
  type: 'p2wpkh',
  address: 'bc1qnativesegwit',
  publicKey: '02aa',
  derivationPath: "m/84'/0'/2'/0/0",
  descriptor: 'wpkh(xpub-native-segwit)',
  fingerprint: 'abcd1234',
};

const taproot = {
  symbol: 'BTC',
  type: 'p2tr',
  address: 'bc1ptaproot',
  publicKey: '02bb',
  tweakedPublicKey: 'cc',
  derivationPath: "m/86'/0'/2'/0/0",
  descriptor: 'tr(xpub-taproot)',
  fingerprint: 'abcd1234',
};

const stacks = {
  symbol: 'STX',
  kind: 'single-sig',
  address: 'SP2J6ZY48GV1EZ5V2V5RB9MP66SW86PYKKNRV9EJ7',
  publicKey: '03dd',
};

describe(mapAddressesResultToPairing.name, () => {
  test('maps a getAddresses result to an account pairing', () => {
    const pairing = mapAddressesResultToPairing(
      { addresses: [nativeSegwit, taproot, stacks] },
      pairedAt
    );
    expect(pairing).toEqual({
      version: 1,
      pairedAt: '2026-11-09T10:00:00.000Z',
      addresses: {
        nativeSegwit: 'bc1qnativesegwit',
        taproot: 'bc1ptaproot',
        stacks: 'SP2J6ZY48GV1EZ5V2V5RB9MP66SW86PYKKNRV9EJ7',
      },
      account: {
        id: { fingerprint: 'abcd1234', accountIndex: 2 },
        bitcoin: {
          type: 'hd',
          nativeSegwitDescriptor: 'wpkh(xpub-native-segwit)',
          taprootDescriptor: 'tr(xpub-taproot)',
        },
        stacks: { stxAddress: 'SP2J6ZY48GV1EZ5V2V5RB9MP66SW86PYKKNRV9EJ7' },
      },
    });
  });

  test('leaves out Stacks when Leather returns no Stacks address', () => {
    const pairing = mapAddressesResultToPairing({ addresses: [nativeSegwit, taproot] }, pairedAt);
    expect(pairing?.account.stacks).toBeUndefined();
    expect(pairing?.addresses.stacks).toBeUndefined();
  });

  test('leaves out the HD descriptors when the taproot address is missing', () => {
    const pairing = mapAddressesResultToPairing({ addresses: [nativeSegwit, stacks] }, pairedAt);
    expect(pairing?.account.bitcoin).toBeUndefined();
    expect(pairing?.account.stacks).toEqual({ stxAddress: stacks.address });
  });

  test('returns null without a native segwit address', () => {
    expect(mapAddressesResultToPairing({ addresses: [taproot, stacks] }, pairedAt)).toBeNull();
  });

  test('returns null when the derivation path has no account index', () => {
    const result = { addresses: [{ ...nativeSegwit, derivationPath: 'm/0/0' }, taproot] };
    expect(mapAddressesResultToPairing(result, pairedAt)).toBeNull();
  });

  test('returns null for a result that is not a getAddresses response', () => {
    expect(mapAddressesResultToPairing({ addresses: 'nope' }, pairedAt)).toBeNull();
    expect(mapAddressesResultToPairing(undefined, pairedAt)).toBeNull();
  });
});
