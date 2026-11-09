import { z } from 'zod';

import { IS_TEST_ENV } from '@shared/environment';
import { logger } from '@shared/logger';
import { isSidePanelSupported, sidePanelPagePath } from '@shared/side-panel/side-panel';

const persistedRootKey = 'persist:root';

const actionPopupPath = 'action-popup.html';

const disabledRequestPanelTabsKey = 'side-panel-disabled-request-panel-tabs';

const sidePanelAvailabilityStateSchema = z.looseObject({
  wallets: z.looseObject({ ids: z.array(z.unknown()) }).optional(),
  settings: z.looseObject({ isSidePanelModeEnabled: z.boolean().optional() }).optional(),
});

export function isSidePanelModeActiveForState(state: unknown) {
  const parsedState = sidePanelAvailabilityStateSchema.safeParse(state);
  if (!parsedState.success) return false;
  const hasWallet = (parsedState.data.wallets?.ids.length ?? 0) > 0;
  const isEnabled = parsedState.data.settings?.isSidePanelModeEnabled ?? true;
  return hasWallet && isEnabled;
}

const disabledRequestPanelTabsSchema = z.array(z.number());

const tabsWithRequestPanels = new Set<number>();

export function trackTabWithRequestPanel(tabId: number) {
  tabsWithRequestPanels.add(tabId);
}

let isSidePanelModeActive: boolean | null = null;

async function readDisabledRequestPanelTabs() {
  const storage = await chrome.storage.session.get<Record<string, unknown>>(
    disabledRequestPanelTabsKey
  );
  const parsedTabIds = disabledRequestPanelTabsSchema.safeParse(
    storage[disabledRequestPanelTabsKey]
  );
  return parsedTabIds.success ? parsedTabIds.data : [];
}

async function disableRequestPanels() {
  const tabIds = [
    ...new Set([...tabsWithRequestPanels, ...(await readDisabledRequestPanelTabs())]),
  ];
  tabsWithRequestPanels.clear();
  await chrome.storage.session.set({ [disabledRequestPanelTabsKey]: tabIds });
  await Promise.all(
    tabIds.map(tabId =>
      chrome.sidePanel.setOptions({ tabId, enabled: false }).catch(() => undefined)
    )
  );
}

async function restoreRequestPanels() {
  const tabIds = await readDisabledRequestPanelTabs();
  if (tabIds.length === 0) return;
  await chrome.storage.session.remove(disabledRequestPanelTabsKey);
  tabIds.forEach(trackTabWithRequestPanel);
  await Promise.all(
    tabIds.map(tabId =>
      chrome.sidePanel
        .setOptions({ tabId, enabled: true, path: sidePanelPagePath })
        .catch(() => undefined)
    )
  );
}

async function applySidePanelAvailability(isActive: boolean) {
  if (isSidePanelModeActive === isActive) return;
  isSidePanelModeActive = isActive;
  await chrome.action.setPopup({ popup: isActive ? '' : actionPopupPath });
  await chrome.sidePanel.setOptions({ enabled: isActive, path: sidePanelPagePath });
  await chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: isActive });
  if (isActive) await restoreRequestPanels();
  else await disableRequestPanels();
}

async function syncSidePanelAvailability(state: unknown) {
  try {
    await applySidePanelAvailability(isSidePanelModeActiveForState(state));
  } catch (error) {
    logger.error('Unable to sync side panel availability', error);
  }
}

async function readPersistedRootState() {
  const storage = await chrome.storage.local.get<Record<string, unknown>>(persistedRootKey);
  return storage[persistedRootKey];
}

let pendingSync: Promise<void> = Promise.resolve();

async function syncAfter(previousSync: Promise<void>) {
  await previousSync;
  await syncSidePanelAvailability(await readPersistedRootState());
}

function queueSidePanelAvailabilitySync() {
  pendingSync = syncAfter(pendingSync);
}

export function initSidePanelAvailabilitySync() {
  if (!isSidePanelSupported()) return;
  if (IS_TEST_ENV) {
    isSidePanelModeActive = false;
    return;
  }
  queueSidePanelAvailabilitySync();
  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName !== 'local' || !(persistedRootKey in changes)) return;
    queueSidePanelAvailabilitySync();
  });
}

export function isSidePanelModeActiveNow() {
  return isSidePanelModeActive === true;
}

export function isSidePanelModeInactiveNow() {
  return isSidePanelModeActive === false;
}

export async function getIsSidePanelModeActive() {
  await pendingSync;
  return isSidePanelModeActiveNow();
}
