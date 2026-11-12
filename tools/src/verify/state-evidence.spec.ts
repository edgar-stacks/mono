import { describe, expect, test } from 'vitest';

import { buildStateEvidence, defaultStateSlices, parseStateSlices } from './state-evidence.js';

const whitelist = ['accounts', 'active', 'networks', 'softwareKeys', 'wallets', 'keychains'];

describe(parseStateSlices.name, () => {
  test('defaults to active, networks and wallets', () => {
    expect(parseStateSlices(undefined, whitelist)).toEqual({
      ok: true,
      slices: [...defaultStateSlices],
    });
  });

  test("expands 'all' to the persist whitelist and dedupes a list", () => {
    expect(parseStateSlices('all', whitelist)).toEqual({ ok: true, slices: whitelist });
    expect(parseStateSlices('wallets, active,wallets', whitelist)).toEqual({
      ok: true,
      slices: ['wallets', 'active'],
    });
  });

  test('rejects slices outside the whitelist and empty lists', () => {
    const unknown = parseStateSlices('wallets,keys,cache', whitelist);
    expect(unknown.ok ? '' : unknown.error).toBe(
      "--state: keys, cache are not persisted slices. Use slices of persistWhitelist: accounts, active, networks, softwareKeys, wallets, keychains, or 'all'."
    );
    expect(parseStateSlices(' , ', whitelist).ok).toBe(false);
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
    keychains: { entities: { a: { nested: [{ encryptedSecretKey: 'deadbeef' }] } } },
    settings: { userSelectedTheme: 'system' },
  };

  test('keeps only the requested slices and redacts the secret material', () => {
    const evidence = buildStateEvidence(persisted, { encryptionKey: 'd904f412' }, [
      'active',
      'softwareKeys',
      'keychains',
      'wallets',
    ]);
    expect(evidence).toEqual({
      slices: {
        active: persisted.active,
        softwareKeys: {
          salt: '[redacted]',
          ids: ['e87a850b'],
          entities: { e87a850b: { id: 'e87a850b', encryptedSecretKey: '[redacted]' } },
        },
        keychains: { entities: { a: { nested: [{ encryptedSecretKey: '[redacted]' }] } } },
      },
      missingSlices: ['wallets'],
      encryptionKeyPresent: true,
    });
    expect(JSON.stringify(evidence)).not.toContain('d904f412');
    expect(JSON.stringify(evidence)).not.toContain('a086b877');
    expect(JSON.stringify(evidence)).not.toContain('ff735c24');
  });

  test('reports a missing session key and tolerates empty storage', () => {
    expect(buildStateEvidence(undefined, {}, ['active'])).toEqual({
      slices: {},
      missingSlices: ['active'],
      encryptionKeyPresent: false,
    });
  });
});
