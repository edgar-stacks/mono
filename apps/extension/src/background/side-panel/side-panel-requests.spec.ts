import { beforeEach, describe, expect, test, vi } from 'vitest';

import type { RpcRequests } from '@leather.io/rpc';

const mocks = vi.hoisted(() => ({
  getRootState: vi.fn(),
  sidePanelOpen: vi.fn(),
  sidePanelSetOptions: vi.fn(),
}));

vi.mock('@shared/storage/get-root-state', () => ({ getRootState: mocks.getRootState }));

vi.mock('@background/popup', () => ({ popup: vi.fn() }));

const tabId = 7;

const walletState = {
  wallets: { entities: { default: {} } },
  settings: { isSidePanelModeEnabled: true },
};

const getAddressesRequest: RpcRequests = { jsonrpc: '2.0', id: '1', method: 'getAddresses' };

async function importSidePanelRequests() {
  vi.resetModules();
  return import('./side-panel-requests');
}

async function flushPromises() {
  for (let tick = 0; tick < 5; tick++) await new Promise(resolve => setTimeout(resolve, 0));
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.getRootState.mockResolvedValue(walletState);
  mocks.sidePanelOpen.mockResolvedValue(undefined);
  mocks.sidePanelSetOptions.mockResolvedValue(undefined);
  vi.stubGlobal('chrome', {
    sidePanel: { open: mocks.sidePanelOpen, setOptions: mocks.sidePanelSetOptions },
  });
});

describe(`openSidePanelWithUserGesture`, () => {
  test('opens the panel synchronously before the availability has been read', async () => {
    const { openSidePanelWithUserGesture } = await importSidePanelRequests();

    openSidePanelWithUserGesture(tabId, getAddressesRequest);

    expect(mocks.sidePanelOpen).toHaveBeenCalledWith({ tabId });
  });

  test('disables the tab panel when the availability read shows the mode is off', async () => {
    mocks.getRootState.mockResolvedValue({
      ...walletState,
      settings: { isSidePanelModeEnabled: false },
    });
    const { openSidePanelWithUserGesture } = await importSidePanelRequests();

    openSidePanelWithUserGesture(tabId, getAddressesRequest);
    await flushPromises();

    expect(mocks.sidePanelSetOptions).toHaveBeenLastCalledWith({ tabId, enabled: false });
  });

  test('opens the panel for an open request in popup mode', async () => {
    const { openSidePanelWithUserGesture } = await importSidePanelRequests();

    openSidePanelWithUserGesture(tabId, {
      jsonrpc: '2.0',
      id: '1',
      method: 'open',
      params: { mode: 'popup' },
    });

    expect(mocks.sidePanelOpen).toHaveBeenCalledWith({ tabId });
  });

  test('does not open the panel for an open request in full page mode', async () => {
    const { openSidePanelWithUserGesture } = await importSidePanelRequests();

    openSidePanelWithUserGesture(tabId, {
      jsonrpc: '2.0',
      id: '1',
      method: 'open',
      params: { mode: 'fullpage' },
    });

    expect(mocks.sidePanelOpen).not.toHaveBeenCalled();
  });

  test('does not open the panel for a request that never shows an approval', async () => {
    const { openSidePanelWithUserGesture } = await importSidePanelRequests();

    openSidePanelWithUserGesture(tabId, { jsonrpc: '2.0', id: '1', method: 'getInfo' });

    expect(mocks.sidePanelOpen).not.toHaveBeenCalled();
  });
});
