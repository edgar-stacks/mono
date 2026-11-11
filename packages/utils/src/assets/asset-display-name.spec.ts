import { describe, expect, it } from 'vitest';

import { getAssetDisplayName } from './asset-display-name';

type CryptoAsset = Parameters<typeof getAssetDisplayName>[0];
type Sip10Asset = Extract<CryptoAsset, { protocol: 'sip10' }>;
type Sip9Asset = Extract<CryptoAsset, { protocol: 'sip9' }>;

function createSip10Asset(name: string): Sip10Asset {
  return {
    chain: 'stacks',
    category: 'fungible',
    protocol: 'sip10',
    name,
    symbol: 'TKN',
    decimals: 6,
    hasMemo: true,
    canTransfer: true,
    assetId: 'SP000000000000000000002Q6VF78.token::token',
    contractId: 'SP000000000000000000002Q6VF78.token',
    imageCanonicalUri: '',
  };
}

function createSip9Asset(name: string): Sip9Asset {
  return {
    chain: 'stacks',
    category: 'nft',
    protocol: 'sip9',
    name,
    description: '',
    assetId: 'SP000000000000000000002Q6VF78.nft::nft',
    contractId: 'SP000000000000000000002Q6VF78.nft',
    tokenId: 1,
    content: { contentUrl: '', contentType: 'image/png' },
  };
}

describe(getAssetDisplayName.name, () => {
  it('removes a right-to-left override from a sip10 name', () => {
    expect(getAssetDisplayName(createSip10Asset('safe\u202Eevil'))).toBe('safeevil');
  });

  it('removes a zero-width space from a sip10 name', () => {
    expect(getAssetDisplayName(createSip10Asset('US\u200BDC'))).toBe('USDC');
  });

  it('removes every bidi control and zero-width character', () => {
    const name =
      '\u202AA\u202BB\u202CC\u202DD\u202EE\u2066F\u2067G\u2068H\u2069I\u200BJ\u2060K\uFEFFL';
    expect(getAssetDisplayName(createSip10Asset(name))).toBe('ABCDEFGHIJKL');
  });

  it('keeps zero-width joiners in emoji names', () => {
    const name = '\u{1F468}\u200D\u{1F469}\u200D\u{1F467} DAO';
    expect(getAssetDisplayName(createSip10Asset(name))).toBe(name);
  });

  it('keeps zero-width non-joiners', () => {
    const name = '\u0645\u06CC\u200C\u062E\u0648\u0627\u0647\u0645';
    expect(getAssetDisplayName(createSip10Asset(name))).toBe(name);
  });

  it('returns an empty string when only stripped characters remain', () => {
    expect(getAssetDisplayName(createSip10Asset('\u202E\u200B'))).toBe('');
  });

  it('removes bidi controls from a sip9 name', () => {
    expect(getAssetDisplayName(createSip9Asset('safe\u202Eevil'))).toBe('safeevil');
  });
});
