import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import { createShowSidePanelOverlayMessage } from '@shared/utils/side-panel-request-overlay';

vi.mock('@background/popup', () => ({ popup: vi.fn() }));

vi.mock('@shared/messaging/send-message-to-originating-frame', () => ({
  sendMessageToOriginatingFrame: vi.fn(),
}));

const persistedRootKey = 'persist:root';

const dappTabId = 5;

type StorageChangeListener = (changes: Record<string, unknown>, areaName: string) => void;

function createStorageArea(initial: Record<string, unknown> = {}) {
  const store = new Map<string, unknown>(Object.entries(initial));
  return {
    get(key: string) {
      return Promise.resolve(store.has(key) ? { [key]: store.get(key) } : {});
    },
    set(items: Record<string, unknown>) {
      Object.entries(items).forEach(([key, value]) => store.set(key, value));
      return Promise.resolve();
    },
    remove(keys: string | string[]) {
      [keys].flat().forEach(key => store.delete(key));
      return Promise.resolve();
    },
  };
}

function buildPersistedState(isSidePanelModeEnabled: boolean) {
  return {
    wallets: { ids: ['wallet-1'], entities: {} },
    settings: { isSidePanelModeEnabled },
  };
}

async function flushPromises() {
  for (let tick = 0; tick < 10; tick++) await new Promise(resolve => setTimeout(resolve, 0));
}

let storageChangeListeners: StorageChangeListener[];
let localStorageArea: ReturnType<typeof createStorageArea>;
let releaseLocalStorage: () => void;
let sidePanel: {
  open: ReturnType<typeof vi.fn>;
  setOptions: ReturnType<typeof vi.fn>;
  setPanelBehavior: ReturnType<typeof vi.fn>;
};

function stubChrome() {
  const localStorageRead = new Promise<void>(resolve => {
    releaseLocalStorage = resolve;
  });
  vi.stubGlobal('chrome', {
    action: { setPopup: vi.fn(() => Promise.resolve()) },
    sidePanel,
    runtime: {
      ContextType: { SIDE_PANEL: 'SIDE_PANEL' },
      getContexts: vi.fn(() => Promise.resolve([])),
      onConnect: { addListener: vi.fn() },
    },
    tabs: {
      onRemoved: { addListener: vi.fn() },
      sendMessage: vi.fn(() => Promise.resolve()),
    },
    storage: {
      local: {
        async get(key: string) {
          await localStorageRead;
          return localStorageArea.get(key);
        },
      },
      session: createStorageArea(),
      onChanged: {
        addListener(listener: StorageChangeListener) {
          storageChangeListeners.push(listener);
        },
      },
    },
  });
}

async function changePersistedState(isSidePanelModeEnabled: boolean) {
  const newValue = buildPersistedState(isSidePanelModeEnabled);
  await localStorageArea.set({ [persistedRootKey]: newValue });
  storageChangeListeners.forEach(listener =>
    listener({ [persistedRootKey]: { newValue } }, 'local')
  );
  await flushPromises();
}

async function loadModules() {
  vi.resetModules();
  const availability = await import('./side-panel-availability');
  const requests = await import('./side-panel-requests');
  return { ...availability, ...requests };
}

beforeEach(() => {
  storageChangeListeners = [];
  localStorageArea = createStorageArea({ [persistedRootKey]: buildPersistedState(true) });
  sidePanel = {
    open: vi.fn(() => Promise.resolve()),
    setOptions: vi.fn(() => Promise.resolve()),
    setPanelBehavior: vi.fn(() => Promise.resolve()),
  };
  stubChrome();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('prepareSidePanelForRequest', () => {
  test('opens the panel inside the gesture of a request that wakes the worker', async () => {
    const { initSidePanelAvailabilitySync, prepareSidePanelForRequest, openRequestInSidePanel } =
      await loadModules();
    initSidePanelAvailabilitySync();

    prepareSidePanelForRequest(dappTabId, { id: 'request-1', method: 'getAddresses' });

    expect(sidePanel.open).toHaveBeenCalledWith({ tabId: dappTabId });

    releaseLocalStorage();
    const isRouted = await openRequestInSidePanel(
      '/get-addresses',
      new URLSearchParams({ tabId: String(dappTabId), requestId: 'request-1' })
    );

    expect(isRouted).toBe(true);
    expect(chrome.tabs.sendMessage).toHaveBeenCalledWith(
      dappTabId,
      createShowSidePanelOverlayMessage({
        requestId: 'request-1',
        category: 'connection',
        variant: 'review',
      }),
      { frameId: 0 }
    );
  });

  test('does not open the panel once the mode is known to be off', async () => {
    localStorageArea = createStorageArea({ [persistedRootKey]: buildPersistedState(false) });
    const { initSidePanelAvailabilitySync, prepareSidePanelForRequest } = await loadModules();
    initSidePanelAvailabilitySync();
    releaseLocalStorage();
    await flushPromises();

    prepareSidePanelForRequest(dappTabId, { id: 'request-1', method: 'getAddresses' });

    expect(sidePanel.open).not.toHaveBeenCalled();
  });
});

describe('initSidePanelAvailabilitySync', () => {
  test('re-enables the panel of a tab that hosted a request when the mode turns back on', async () => {
    const { initSidePanelAvailabilitySync, prepareSidePanelForRequest } = await loadModules();
    initSidePanelAvailabilitySync();
    releaseLocalStorage();
    await flushPromises();
    prepareSidePanelForRequest(dappTabId, { id: 'request-1', method: 'getAddresses' });
    await flushPromises();

    await changePersistedState(false);
    expect(sidePanel.setOptions).toHaveBeenCalledWith({ tabId: dappTabId, enabled: false });

    sidePanel.setOptions.mockClear();
    await changePersistedState(true);
    expect(sidePanel.setOptions).toHaveBeenCalledWith({
      tabId: dappTabId,
      enabled: true,
      path: 'side-panel.html',
    });
  });

  test('re-enables a disabled tab after the worker restarts', async () => {
    const firstWorker = await loadModules();
    firstWorker.initSidePanelAvailabilitySync();
    releaseLocalStorage();
    await flushPromises();
    firstWorker.prepareSidePanelForRequest(dappTabId, { id: 'request-1', method: 'getAddresses' });
    await flushPromises();
    await changePersistedState(false);

    storageChangeListeners = [];
    sidePanel.setOptions.mockClear();
    const restartedWorker = await loadModules();
    restartedWorker.initSidePanelAvailabilitySync();
    await changePersistedState(true);

    expect(sidePanel.setOptions).toHaveBeenCalledWith({
      tabId: dappTabId,
      enabled: true,
      path: 'side-panel.html',
    });
  });
});
