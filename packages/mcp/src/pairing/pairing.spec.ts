import { mapAddressesResultToPairing } from './pairing';

const pairedAt = new Date('2026-01-01T00:00:00.000Z');

const nativeSegwitDescriptor =
  "wpkh([73c5da0a/84'/0'/2']xpub6CatWdiZiodmUeTDp8LT5or8nmbKNcuyvz7WyksVFkKB4RHwCD3XyuvPEbvqAQY3rAPshWcMLoP2fMFMKHPJ4ZeZXYVUhLv1VMrjPC7PW6V/0/*)";
const taprootDescriptor =
  "tr([73c5da0a/86'/0'/2']xpub6BgBgsespWvERF3LHQu6CnqdvfEvtMcQjYrcRzx53QJjSxarj2afYWcLteoGVky7D3UKDP9QyrLprQ3VCECoY49yfdDEHGCtMMj92pReUsQ/0/*)";

const nativeSegwitAddress = {
  symbol: 'BTC',
  type: 'p2wpkh',
  address: 'bc1qcr8te4kr609gcawutmrza0j4xv80jy8z306fyu',
  publicKey: '0330d54fd0dd420a6e5f8d3624f5f3482cae350f79d5f0753bf5beef9c2d91af3c',
  derivationPath: "m/84'/0'/2'/0/0",
  descriptor: nativeSegwitDescriptor,
  fingerprint: '73c5da0a',
};

const taprootAddress = {
  symbol: 'BTC',
  type: 'p2tr',
  address: 'bc1p5cyxnuxmeuwuvkwfem96lqzszd02n6xdcjrs20cac6yqjjwudpxqkedrcr',
  publicKey: '03cc8a4bc64d897bddc5fbc2f670f7a8ba0b386779106cf1223c6fc5d7cd6fc115',
  tweakedPublicKey: 'cc8a4bc64d897bddc5fbc2f670f7a8ba0b386779106cf1223c6fc5d7cd6fc115',
  derivationPath: "m/86'/0'/2'/0/0",
  descriptor: taprootDescriptor,
  fingerprint: '73c5da0a',
};

const stacksAddress = {
  symbol: 'STX',
  kind: 'single-sig',
  address: 'SP384CVPNDTYA0E92TKJZQTYXQHNZSWGCAG7SAPVB',
  publicKey: '0329b076bc20f7b1592b2a1a5cb91dfefe8c966e50e256458e23dd2c5d63f8f1af',
};

describe(mapAddressesResultToPairing.name, () => {
  test('maps a single-sig account to HD bitcoin descriptors and a Stacks address', () => {
    const mapped = mapAddressesResultToPairing(
      { addresses: [nativeSegwitAddress, taprootAddress, stacksAddress] },
      pairedAt
    );

    expect(mapped).toEqual({
      ok: true,
      pairing: {
        account: {
          id: { fingerprint: '73c5da0a', accountIndex: 2 },
          bitcoin: { type: 'hd', taprootDescriptor, nativeSegwitDescriptor },
          stacks: { stxAddress: stacksAddress.address },
        },
        addresses: {
          bitcoinPayment: nativeSegwitAddress.address,
          bitcoinTaproot: taprootAddress.address,
          stacks: stacksAddress.address,
        },
        pairedAt: '2026-01-01T00:00:00.000Z',
      },
    });
  });

  test('pairs a Stacks-only account', () => {
    const mapped = mapAddressesResultToPairing({ addresses: [stacksAddress] }, pairedAt);

    expect(mapped.ok && mapped.pairing.account).toEqual({
      id: { fingerprint: 'leather-mcp', accountIndex: 0 },
      stacks: { stxAddress: stacksAddress.address },
    });
  });

  test('uses a fixed address for a bitcoin policy account', () => {
    const policyAddress = {
      symbol: 'BTC',
      type: 'p2wsh',
      address: 'bc1qrp33g0q5c5txsp9arysrx4k6zdkfs4nce4xj0gdcccefvpysxf3qccfmv3',
      descriptor:
        'wsh(sortedmulti(2,[aaaaaaaa/48h/0h/0h/2h]xpubA/0/*,[bbbbbbbb/48h/0h/0h/2h]xpubB/0/*))',
    };

    const mapped = mapAddressesResultToPairing({ addresses: [policyAddress] }, pairedAt);

    expect(mapped.ok && mapped.pairing.account.bitcoin).toEqual({
      type: 'fixedAddress',
      address: policyAddress.address,
      paymentType: 'p2wsh',
    });
  });

  test('rejects testnet addresses', () => {
    const mapped = mapAddressesResultToPairing(
      {
        addresses: [{ ...stacksAddress, address: 'ST384CVPNDTYA0E92TKJZQTYXQHNZSWGCAG7AHB3H' }],
      },
      pairedAt
    );

    expect(mapped.ok).toBe(false);
  });

  test('rejects a result without addresses', () => {
    expect(mapAddressesResultToPairing({ addresses: [] }, pairedAt).ok).toBe(false);
  });

  test('rejects a malformed result', () => {
    expect(mapAddressesResultToPairing({ accounts: [] }, pairedAt).ok).toBe(false);
    expect(mapAddressesResultToPairing(undefined, pairedAt).ok).toBe(false);
  });
});
