import { describe, expect, test } from 'vitest';

import { buildStateEvidence, redactedValue, resolveStateSlices } from './state-evidence.js';

const persistedRoot = {
  active: { account: { fingerprint: 'e87a850b', accountIndex: 0 } },
  networks: { currentNetworkId: 'mainnet' },
  wallets: { ids: ['e87a850b'] },
  softwareKeys: {
    salt: 'a086b877fc757a4daa7c6343d2861c05',
    ids: ['e87a850b'],
    entities: { e87a850b: { id: 'e87a850b', encryptedSecretKey: 'ff735c24' } },
  },
};

describe(buildStateEvidence.name, () => {
  test('keeps only the requested slices and reports missing ones', () => {
    const evidence = buildStateEvidence({
      persistedRoot,
      slices: ['active', 'policy'],
      encryptionKeyPresent: true,
    });
    expect(evidence).toEqual({
      slices: { active: persistedRoot.active },
      missingSlices: ['policy'],
      encryptionKeyPresent: true,
    });
  });

  test('replaces the salt and every encrypted secret key', () => {
    const evidence = buildStateEvidence({
      persistedRoot,
      slices: ['softwareKeys'],
      encryptionKeyPresent: false,
    });
    expect(evidence.slices.softwareKeys).toEqual({
      salt: redactedValue,
      ids: ['e87a850b'],
      entities: { e87a850b: { id: 'e87a850b', encryptedSecretKey: redactedValue } },
    });
    expect(JSON.stringify(evidence)).not.toContain('ff735c24');
    expect(JSON.stringify(evidence)).not.toContain('a086b877');
  });

  test('treats a missing root as empty', () => {
    expect(
      buildStateEvidence({
        persistedRoot: undefined,
        slices: ['active'],
        encryptionKeyPresent: false,
      })
    ).toEqual({ slices: {}, missingSlices: ['active'], encryptionKeyPresent: false });
  });
});

describe(resolveStateSlices.name, () => {
  const whitelist = ['active', 'networks', 'wallets', 'softwareKeys'];
  const defaults = ['active', 'networks', 'wallets'];

  test('defaults, expands all and flags slices outside the whitelist', () => {
    expect(resolveStateSlices(undefined, whitelist, defaults)).toEqual({
      slices: defaults,
      unknown: [],
    });
    expect(resolveStateSlices('all', whitelist, defaults).slices).toEqual(whitelist);
    expect(resolveStateSlices('active, bogus', whitelist, defaults)).toEqual({
      slices: ['active', 'bogus'],
      unknown: ['bogus'],
    });
  });
});
