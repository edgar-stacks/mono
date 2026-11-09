import { parseFungibleAssetId, toBaseUnits } from './asset-identifier';

describe(parseFungibleAssetId.name, () => {
  test('reads native assets case-insensitively', () => {
    expect(parseFungibleAssetId('btc')).toEqual({ protocol: 'nativeBtc', id: 'BTC' });
    expect(parseFungibleAssetId('STX')).toEqual({ protocol: 'nativeStx', id: 'STX' });
  });

  test('reads a SIP-10 asset identifier', () => {
    const id = 'SM3VDXK3WZZSA84XXFKAFAF15NNZX32CTSG82JFQ4.sbtc-token::sbtc-token';
    expect(parseFungibleAssetId(id)).toEqual({ protocol: 'sip10', id });
  });

  test('returns null for anything else', () => {
    expect(parseFungibleAssetId('sBTC')).toBeNull();
  });
});

describe(toBaseUnits.name, () => {
  test('converts a display amount to base units', () => {
    expect(toBaseUnits('0.0015', 8)?.toString()).toBe('150000');
  });

  test('rejects amounts with more decimals than the asset has', () => {
    expect(toBaseUnits('0.000000001', 8)).toBeNull();
  });

  test('rejects zero, negative and non-numeric amounts', () => {
    expect(toBaseUnits('0', 8)).toBeNull();
    expect(toBaseUnits('-1', 8)).toBeNull();
    expect(toBaseUnits('abc', 8)).toBeNull();
  });
});
