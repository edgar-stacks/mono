import { describe, expect, it } from 'vitest';

import { approvalScreens } from './scenario-catalog';

describe('approvalScreens', () => {
  it('pairs every screen with a capture of the current extension or says why there is none', () => {
    const missing = approvalScreens
      .filter(screen => !screen.capture && !screen.captureNote)
      .map(screen => screen.id);
    expect(missing).toEqual([]);
  });

  it('captures every screen the current extension can reach without a device', () => {
    const uncaptured = approvalScreens.filter(screen => !screen.capture).map(screen => screen.id);
    expect(uncaptured).toEqual([
      'vault-bitcoin-broadcast',
      'ledger-sign',
      'outcome-pending',
      'outcome-confirmed',
      'outcome-signed',
      'outcome-failed-broadcast',
      'outcome-failed-on-chain',
    ]);
  });
});
