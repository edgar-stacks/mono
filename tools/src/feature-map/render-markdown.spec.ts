import { describe, expect, test } from 'vitest';

import { getFeatureMapAppConfig } from './app-config.js';
import { buildFeatureMapModel } from './model.js';
import { cell, verifyLine } from './render-markdown.js';

describe(cell.name, () => {
  test('escapes backslashes before pipes and flattens newlines', () => {
    expect(cell('a\\b | c\nd')).toBe('a\\\\b \\| c d');
    expect(cell('plain')).toBe('plain');
  });
});

describe(verifyLine.name, () => {
  const model = buildFeatureMapModel(getFeatureMapAppConfig('extension'));

  function line(id: string) {
    const feature = model.features.find(item => item.id === id);
    if (!feature) throw new Error(`no feature ${id}`);
    return verifyLine(model, feature);
  }

  test('prints the command for an entry a run can open', () => {
    expect(line('receive-dialog')).toBe('`pnpm lt verify extension --feature receive-dialog`');
  });

  test('prints the reason instead of a command', () => {
    expect(line('ledger-flow')).toBe(
      'Not verifiable: a behavior entry has no screen to open; reproduce it through its specs.'
    );
  });
});
