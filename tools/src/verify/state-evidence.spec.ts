import { describe, expect, test } from 'vitest';

import {
  buildStateEvidence,
  defaultStateSlices,
  parseStateSlices,
  redactedValue,
} from './state-evidence.js';

const whitelist = ['accounts', 'active', 'networks', 'softwareKeys', 'wallets'];

describe(parseStateSlices.name, () => {
  test('defaults to active, networks and wallets', () => {
    expect(parseStateSlices(undefined, whitelist)).toEqual({ slices: [...defaultStateSlices] });
  });

  test('expands all to every persisted slice', () => {
    expect(parseStateSlices('all', whitelist)).toEqual({ slices: whitelist });
  });

  test('dedupes a list and rejects slices outside persistWhitelist', () => {
    expect(parseStateSlices('wallets, active,wallets', whitelist)).toEqual({
      slices: ['wallets', 'active'],
    });
    expect(parseStateSlices('wallets,keys', whitelist)).toEqual({
      error:
        '--state: keys is not persisted. Use all or a list of accounts, active, networks, softwareKeys, wallets.',
    });
    expect(parseStateSlices(' , ', whitelist)).toEqual({
      error: '--state needs at least one slice or all',
    });
  });
});

describe(buildStateEvidence.name, () => {
  const persisted = {
    active: { account: { fingerprint: 'e87a850b', accountIndex: 0 } },
    softwareKeys: {
      salt: 'a086b877fc757a4daa7c6343d2861c05',
      ids: ['e87a850b'],
      entities: { e87a850b: { id: 'e87a850b', encryptedSecretKey: 'ff735c24' } },
    },
    wallets: { ids: ['e87a850b'], nested: [{ encryptedSecretKey: 'abc' }] },
  };

  test('keeps only the requested slices and lists the missing ones', () => {
    const evidence = buildStateEvidence({
      persisted,
      slices: ['active', 'networks'],
      encryptionKeyPresent: true,
    });
    expect(evidence).toEqual({
      slices: { active: persisted.active },
      missing: ['networks'],
      encryptionKeyPresent: true,
    });
  });

  test('replaces the salt and every encryptedSecretKey', () => {
    const evidence = buildStateEvidence({
      persisted,
      slices: ['softwareKeys', 'wallets'],
      encryptionKeyPresent: false,
    });
    expect(evidence.slices).toEqual({
      softwareKeys: {
        salt: redactedValue,
        ids: ['e87a850b'],
        entities: { e87a850b: { id: 'e87a850b', encryptedSecretKey: redactedValue } },
      },
      wallets: { ids: ['e87a850b'], nested: [{ encryptedSecretKey: redactedValue }] },
    });
    expect(JSON.stringify(evidence)).not.toContain('a086b877');
    expect(JSON.stringify(evidence)).not.toContain('ff735c24');
  });

  test('tolerates a missing persisted root', () => {
    expect(
      buildStateEvidence({ persisted: undefined, slices: ['active'], encryptionKeyPresent: false })
    ).toEqual({ slices: {}, missing: ['active'], encryptionKeyPresent: false });
  });
});
