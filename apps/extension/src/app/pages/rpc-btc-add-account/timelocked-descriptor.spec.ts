import { sha256 } from '@noble/hashes/sha256';
import { bytesToHex } from '@noble/hashes/utils';
import { describe, expect, test } from 'vitest';

import { makeNativeSegwitAccountXpub, makeNativeSegwitAddressPubkeyHex } from '@leather.io/bitcoin';

import { matchTimelockedDescriptor } from './timelocked-descriptor';

const xpubA = makeNativeSegwitAccountXpub(1);
const xpubB = makeNativeSegwitAccountXpub(2);
const counterpartyKey = makeNativeSegwitAddressPubkeyHex(9);
const hash = bytesToHex(sha256(new Uint8Array([1, 2, 3])));
const unlockHeight = 1000;

function makeBondDescriptor(vaultExpression: string) {
  return `wsh(and_v(v:or_i(after(${unlockHeight}),and_v(v:sha256(${hash}),pk(${counterpartyKey}))),${vaultExpression}))`;
}

describe(matchTimelockedDescriptor.name, () => {
  test('returns the spending conditions of a multisig vault', () => {
    expect(
      matchTimelockedDescriptor(makeBondDescriptor(`sortedmulti(1,${xpubA}/0/0,${xpubB}/0/0)`))
    ).toEqual({
      unlockHeight,
      hash,
      counterpartyKey,
      vaultKind: 'multi',
      vaultThreshold: 1,
      vaultKeyExpressions: [`${xpubA}/0/0`, `${xpubB}/0/0`],
    });
  });

  test('returns the spending conditions of a single-key vault', () => {
    expect(matchTimelockedDescriptor(makeBondDescriptor(`pk(${xpubA}/0/0)`))).toEqual({
      unlockHeight,
      hash,
      counterpartyKey,
      vaultKind: 'pk',
      vaultThreshold: 1,
      vaultKeyExpressions: [`${xpubA}/0/0`],
    });
  });

  test('returns null for a plain multisig descriptor', () => {
    expect(matchTimelockedDescriptor(`wsh(sortedmulti(1,${xpubA}/0/0,${xpubB}/0/0))`)).toBeNull();
  });

  test('returns null for other miniscript', () => {
    expect(matchTimelockedDescriptor(`wsh(or_d(pk(${xpubA}/0/0),pk(${xpubB}/0/0)))`)).toBeNull();
  });
});
