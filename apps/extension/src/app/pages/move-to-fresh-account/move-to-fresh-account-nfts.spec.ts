import { STACKS_MAINNET } from '@stacks/network';
import { cvToHex, uintCV } from '@stacks/transactions';

import { describeNft, getNftDisplayName } from './move-to-fresh-account-nfts';

const getNftMetadata = vi.fn();

vi.mock('@leather.io/services', () => ({
  getHiroStacksApiClient: () => ({ getNftMetadata }),
}));

describe(getNftDisplayName.name, () => {
  it('falls back to the asset name and the token id', () => {
    expect(
      getNftDisplayName('SP2QEZ06AGJ3RKJPBV14SY1V5BBFNAW33D96YPGZF.BNS-V2::BNS-V2', 'u42')
    ).toEqual('BNS-V2 #42');
  });

  it('keeps a non-uint token id as it is', () => {
    expect(getNftDisplayName('SP000000000000000000002Q6VF78.collection::art', '"abc"')).toEqual(
      'art #"abc"'
    );
  });
});

describe(describeNft.name, () => {
  const holding = {
    asset_identifier: 'SP000000000000000000002Q6VF78.collection::art',
    value: { hex: cvToHex(uintCV(7)), repr: 'u7' },
  };
  const context = { network: STACKS_MAINNET, senderAddress: '' };

  it('labels an NFT from Hiro metadata', async () => {
    getNftMetadata.mockResolvedValueOnce({ name: 'Sunset' });
    const description = await describeNft(holding, context);
    expect(description).toEqual({
      status: 'moves',
      nft: {
        assetIdentifier: holding.asset_identifier,
        tokenHex: holding.value.hex,
        name: 'Sunset',
      },
    });
  });

  it('falls back to the asset name when metadata is missing', async () => {
    getNftMetadata.mockRejectedValueOnce(new Error('not found'));
    const description = await describeNft(holding, context);
    expect(description.nft.name).toEqual('art #7');
  });
});
