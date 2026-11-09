import { getNftDisplayName } from './move-to-fresh-account-nfts';

describe(getNftDisplayName.name, () => {
  it('falls back to the asset name and token id', () => {
    expect(
      getNftDisplayName('SP2QEZ06AGJ3RKJPBV14SY1V5BBFNAW33D96YPGZF.BNS-V2::BNS-V2', 'u42')
    ).toEqual('BNS-V2 #42');
  });

  it('keeps a non-uint token id as it is', () => {
    expect(
      getNftDisplayName('SP2QEZ06AGJ3RKJPBV14SY1V5BBFNAW33D96YPGZF.nft::thing', '"abc"')
    ).toEqual('thing #"abc"');
  });
});
