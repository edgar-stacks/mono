import { sha256 } from '@noble/hashes/sha256';
import { bytesToHex } from '@noble/hashes/utils';

import { makeNativeSegwitAccountXpub, makeNativeSegwitAddressPubkeyHex } from '@leather.io/bitcoin';

import { getTimelockedPolicySubject, matchTimelockedDescriptor } from './timelocked-descriptor';

const xpubA = makeNativeSegwitAccountXpub(1);
const xpubB = makeNativeSegwitAccountXpub(2);
const counterpartyKey = makeNativeSegwitAddressPubkeyHex(9);
const hash = bytesToHex(sha256(new Uint8Array([1, 2, 3])));
const unlockHeight = 900_000;

function makeBondDescriptor(vault: string) {
  return `wsh(and_v(v:or_i(after(${unlockHeight}),and_v(v:sha256(${hash}),pk(${counterpartyKey}))),${vault}))`;
}

describe(matchTimelockedDescriptor.name, () => {
  test('reads the spending conditions of a multi vault bond', () => {
    expect(
      matchTimelockedDescriptor(makeBondDescriptor(`sortedmulti(2,${xpubA}/0/0,${xpubB}/0/0)`))
    ).toEqual({
      unlockHeight,
      hash,
      counterpartyKey,
      vaultKind: 'multi',
      vaultThreshold: 2,
      vaultKeyExpressions: [`${xpubA}/0/0`, `${xpubB}/0/0`],
    });
  });

  test('reads the owner key of a pk vault bond', () => {
    expect(matchTimelockedDescriptor(makeBondDescriptor(`pk(${xpubA}/0/0)`))).toEqual({
      unlockHeight,
      hash,
      counterpartyKey,
      vaultKind: 'pk',
      vaultThreshold: 1,
      vaultKeyExpressions: [`${xpubA}/0/0`],
    });
  });

  test('returns null for a plain multisig', () => {
    expect(matchTimelockedDescriptor(`wsh(sortedmulti(2,${xpubA}/0/0,${xpubB}/0/0))`)).toBeNull();
  });

  test('returns null for a ranged bond', () => {
    expect(matchTimelockedDescriptor(makeBondDescriptor(`pk(${xpubA}/0/*)`))).toBeNull();
  });
});

describe(getTimelockedPolicySubject.name, () => {
  test('names a multi vault bond as the vault', () => {
    const details = matchTimelockedDescriptor(
      makeBondDescriptor(`sortedmulti(2,${xpubA}/0/0,${xpubB}/0/0)`)
    );
    if (!details) throw new Error('Expected a bond');
    expect(getTimelockedPolicySubject(details)).toBe('this vault');
  });

  test('names a pk vault bond as the timelocked address', () => {
    const details = matchTimelockedDescriptor(makeBondDescriptor(`pk(${xpubA}/0/0)`));
    if (!details) throw new Error('Expected a bond');
    expect(getTimelockedPolicySubject(details)).toBe('this timelocked address');
  });
});
