import { describe, expect, test } from 'vitest';

import { isSidePanelModeAvailableForState } from './side-panel-availability';

const walletState = { wallets: { ids: ['e87a850b'], entities: {} } };

describe(isSidePanelModeAvailableForState.name, () => {
  test('is available once a wallet exists and the setting was never stored', () => {
    expect(isSidePanelModeAvailableForState({ ...walletState, settings: {} })).toEqual(true);
  });

  test('follows the stored setting', () => {
    expect(
      isSidePanelModeAvailableForState({
        ...walletState,
        settings: { isSidePanelModeEnabled: false },
      })
    ).toEqual(false);
    expect(
      isSidePanelModeAvailableForState({
        ...walletState,
        settings: { isSidePanelModeEnabled: true },
      })
    ).toEqual(true);
  });

  test('counts software keys or keychains from state that predates wallets', () => {
    expect(isSidePanelModeAvailableForState({ softwareKeys: { ids: ['a'] } })).toEqual(true);
    expect(isSidePanelModeAvailableForState({ keychains: { ids: ['a'] } })).toEqual(true);
  });

  test.each([
    ['missing state', null],
    ['no wallet yet', { wallets: { ids: [] }, softwareKeys: { ids: [] }, settings: {} }],
    ['malformed settings', { ...walletState, settings: { isSidePanelModeEnabled: 'yes' } }],
  ])('is unavailable with %s', (_, state) => {
    expect(isSidePanelModeAvailableForState(state)).toEqual(false);
  });
});
