import { describe, expect, test } from 'vitest';

import { isSidePanelModeActiveForState } from './side-panel-availability';

function buildState({
  walletIds = ['wallet-1'],
  isSidePanelModeEnabled,
}: {
  walletIds?: string[];
  isSidePanelModeEnabled?: boolean;
}) {
  return {
    wallets: { ids: walletIds, entities: {} },
    settings: { userSelectedTheme: 'system', isSidePanelModeEnabled },
  };
}

describe(isSidePanelModeActiveForState.name, () => {
  test('is active once a wallet exists and the setting was never changed', () => {
    expect(isSidePanelModeActiveForState(buildState({}))).toBe(true);
  });

  test('is inactive when the setting is turned off', () => {
    expect(isSidePanelModeActiveForState(buildState({ isSidePanelModeEnabled: false }))).toBe(
      false
    );
  });

  test('is inactive without a wallet so onboarding keeps the action popup', () => {
    expect(isSidePanelModeActiveForState(buildState({ walletIds: [] }))).toBe(false);
    expect(isSidePanelModeActiveForState({ settings: {} })).toBe(false);
  });

  test('is inactive without persisted state', () => {
    expect(isSidePanelModeActiveForState(undefined)).toBe(false);
    expect(isSidePanelModeActiveForState('not-state')).toBe(false);
  });
});
