import { getNftDisplayName } from './move-to-fresh-account-nfts';

describe(getNftDisplayName.name, () => {
  it('falls back to the asset name and the token id', () => {
    expect(
      getNftDisplayName('SP2QEZ06AGJ3RKJPBV14SY1V5BBFNAW33D96YPGZF.BNS-V2::BNS-V2', 'u42')
    ).toEqual('BNS-V2 #42');
  });

  it('keeps a token id without the uint prefix', () => {
    expect(
      getNftDisplayName(
        'SP3D6PV2ACBPEKYJTCMH7HEN02KP87QSP8KTEH335.megapont-ape-club-nft::Megapont-Ape-Club',
        '7'
      )
    ).toEqual('Megapont-Ape-Club #7');
  });
});
