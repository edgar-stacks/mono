import { describe, expect, test } from 'vitest';

import { settingsSlice } from './settings.slice';

const { reducer, actions } = settingsSlice;

describe('toggleSidePanelMode', () => {
  test('turns side panel mode off when it was never set, since it defaults to on', () => {
    const state = reducer(undefined, actions.toggleSidePanelMode());
    expect(state.isSidePanelModeEnabled).toBe(false);
  });

  test('turns side panel mode back on', () => {
    const disabled = reducer(undefined, actions.toggleSidePanelMode());
    expect(reducer(disabled, actions.toggleSidePanelMode()).isSidePanelModeEnabled).toBe(true);
  });
});
