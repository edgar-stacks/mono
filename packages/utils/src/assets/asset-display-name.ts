import { type CryptoAsset } from '@leather.io/models';

import { assertUnreachable } from '../assert-unreachable';

const invisibleAndBidiControlCharacters = /[\u202A-\u202E\u2066-\u2069\u200B\u2060\uFEFF]/g;

function stripInvisibleAndBidiControlCharacters(name: string) {
  return name.replace(invisibleAndBidiControlCharacters, '');
}

export function getAssetDisplayName(asset: CryptoAsset) {
  const { protocol } = asset;

  switch (protocol) {
    case 'nativeBtc':
      return 'bitcoin';
    case 'nativeStx':
      return 'stacks';
    case 'sip10':
      return stripInvisibleAndBidiControlCharacters(asset.name);
    case 'sip9':
      return stripInvisibleAndBidiControlCharacters(asset.name);
    default:
      assertUnreachable(protocol);
  }
}
