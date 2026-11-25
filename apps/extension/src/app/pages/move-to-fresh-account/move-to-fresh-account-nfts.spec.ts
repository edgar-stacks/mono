import { Cl, type ClarityValue, cvToHex } from '@stacks/transactions';
import { describe, expect, test, vi } from 'vitest';

import { bnsContractAddress } from '@leather.io/models';

import { describeNft, getNftDisplayName } from './move-to-fresh-account-nfts';

type DescribeNftClient = Parameters<typeof describeNft>[0]['client'];

const bnsAddress = bnsContractAddress.mainnet;
const bnsAssetIdentifier = `${bnsAddress}.BNS-V2::BNS-V2`;
const otherAssetIdentifier =
  'SP2X0TZ59D5SZ8ACQ6YMCHHNR2ZN51Z32E2CJ173.the-explorer-guild::The-Explorer-Guild';

function createClient({
  bnsFromId = Cl.none(),
  listing = Cl.none(),
  managerTransferable = false,
  metadataName,
}: {
  bnsFromId?: ClarityValue;
  listing?: ClarityValue;
  managerTransferable?: boolean;
  metadataName?: string;
} = {}) {
  const client: DescribeNftClient = {
    callReadOnlyFunction: vi.fn(({ functionName }) => {
      if (functionName === 'get-bns-from-id') return Promise.resolve(bnsFromId);
      return Promise.resolve(
        Cl.ok(
          Cl.tuple({
            namespace: Cl.bufferFromUtf8('btc'),
            properties: Cl.tuple({ 'manager-transferable': Cl.bool(managerTransferable) }),
          })
        )
      );
    }),
    getContractMapEntry: vi.fn(() => Promise.resolve(listing)),
    getNftMetadata: vi.fn(() =>
      Promise.resolve(metadataName ? { sip: 16, name: metadataName } : null)
    ),
  };
  return client;
}

const bnsName = Cl.some(
  Cl.tuple({ name: Cl.bufferFromUtf8('leather'), namespace: Cl.bufferFromUtf8('btc') })
);

function bnsHolding(id = 42) {
  return { assetIdentifier: bnsAssetIdentifier, hex: cvToHex(Cl.uint(id)), repr: `u${id}` };
}

describe(getNftDisplayName.name, () => {
  test('falls back to the asset name and the token id', () => {
    expect(getNftDisplayName(bnsAssetIdentifier, 'u42')).toBe('BNS-V2 #42');
  });

  test('keeps a non uint token id as it is', () => {
    expect(getNftDisplayName(otherAssetIdentifier, '"abc"')).toBe('The-Explorer-Guild #"abc"');
  });
});

describe(describeNft.name, () => {
  test('labels an NFT from its Hiro metadata', async () => {
    const description = await describeNft({
      holding: { assetIdentifier: otherAssetIdentifier, hex: cvToHex(Cl.uint(7)), repr: 'u7' },
      client: createClient({ metadataName: 'Explorer #7' }),
      bnsContractAddress: bnsAddress,
    });

    expect(description).toEqual({ name: 'Explorer #7' });
  });

  test('falls back to the asset name and id without Hiro metadata', async () => {
    const description = await describeNft({
      holding: { assetIdentifier: otherAssetIdentifier, hex: cvToHex(Cl.uint(7)), repr: 'u7' },
      client: createClient(),
      bnsContractAddress: bnsAddress,
    });

    expect(description).toEqual({ name: 'The-Explorer-Guild #7' });
  });

  test('falls back to the asset name and id when the metadata request fails', async () => {
    const client = createClient();
    vi.mocked(client.getNftMetadata).mockRejectedValue(new Error('Network error'));

    const description = await describeNft({
      holding: { assetIdentifier: otherAssetIdentifier, hex: cvToHex(Cl.uint(7)), repr: 'u7' },
      client,
      bnsContractAddress: bnsAddress,
    });

    expect(description).toEqual({ name: 'The-Explorer-Guild #7' });
  });

  test('labels a BNS-V2 name from get-bns-from-id', async () => {
    const description = await describeNft({
      holding: bnsHolding(),
      client: createClient({ bnsFromId: bnsName }),
      bnsContractAddress: bnsAddress,
    });

    expect(description).toEqual({ name: 'leather.btc' });
  });

  test('keeps a BNS-V2 name listed in the market map behind', async () => {
    const client = createClient({
      bnsFromId: bnsName,
      listing: Cl.some(Cl.tuple({ price: Cl.uint(1), commission: Cl.principal(bnsAddress) })),
    });

    const description = await describeNft({
      holding: bnsHolding(),
      client,
      bnsContractAddress: bnsAddress,
    });

    expect(description).toEqual({
      name: 'leather.btc',
      staysBehindReason: 'Listed for sale. Unlist it to move it.',
    });
    expect(client.getContractMapEntry).toHaveBeenCalledWith({
      contractAddress: bnsAddress,
      contractName: 'BNS-V2',
      mapName: 'market',
      key: Cl.uint(42),
    });
  });

  test('keeps a BNS-V2 name in a manager-transferable namespace behind', async () => {
    const description = await describeNft({
      holding: bnsHolding(),
      client: createClient({ bnsFromId: bnsName, managerTransferable: true }),
      bnsContractAddress: bnsAddress,
    });

    expect(description).toEqual({
      name: 'leather.btc',
      staysBehindReason: 'Its namespace only allows transfers through its own app.',
    });
  });

  test('falls back to the asset name and id for an unknown BNS-V2 id', async () => {
    const description = await describeNft({
      holding: bnsHolding(),
      client: createClient(),
      bnsContractAddress: bnsAddress,
    });

    expect(description).toEqual({ name: 'BNS-V2 #42' });
  });
});
