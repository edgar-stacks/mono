import { IS_TEST_ENV } from '@shared/environment';
import { logger } from '@shared/logger';
import { isSidePanelSupported, sidePanelPath } from '@shared/side-panel/side-panel';
import { getRootState } from '@shared/storage/get-root-state';

const actionPopupPath = 'action-popup.html';
const persistedRootKey = 'persist:root';

let isSidePanelModeAvailable = false;
let hasSynced = false;

const tabsWithRequestPanels = new Set<number>();

export function getIsSidePanelModeAvailable() {
  return isSidePanelModeAvailable;
}

export function hasSyncedSidePanelAvailability() {
  return hasSynced;
}

export function canUseSidePanelMode() {
  return !IS_TEST_ENV && isSidePanelSupported();
}

export function trackTabWithRequestPanel(tabId: number) {
  tabsWithRequestPanels.add(tabId);
}

export async function readIsSidePanelModeAvailable() {
  if (!canUseSidePanelMode()) return false;
  const state = await getRootState();
  if (!state) return false;
  const hasWallet = Object.keys(state.wallets?.entities ?? {}).length > 0;
  const isEnabled = state.settings?.isSidePanelModeEnabled ?? true;
  return hasWallet && isEnabled;
}

async function disableRequestPanels() {
  const tabIds = [...tabsWithRequestPanels];
  tabsWithRequestPanels.clear();
  await Promise.all(
    tabIds.map(tabId =>
      chrome.sidePanel.setOptions({ tabId, enabled: false }).catch(() => undefined)
    )
  );
}

async function syncSidePanelAvailability() {
  if (!isSidePanelSupported()) return;
  const isAvailable = await readIsSidePanelModeAvailable();
  const wasAvailable = isSidePanelModeAvailable;
  if (hasSynced && wasAvailable === isAvailable) return;
  hasSynced = true;
  isSidePanelModeAvailable = isAvailable;

  await chrome.action.setPopup({ popup: isAvailable ? '' : actionPopupPath });
  await chrome.sidePanel.setOptions({ path: sidePanelPath, enabled: isAvailable });
  await chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: isAvailable });
  if (wasAvailable && !isAvailable) await disableRequestPanels();
}

export function initSidePanelAvailabilitySync() {
  if (!isSidePanelSupported()) return;

  function sync() {
    syncSidePanelAvailability().catch(e => logger.error('Unable to sync side panel state', e));
  }

  sync();
  chrome.storage.local.onChanged.addListener(changes => {
    if (persistedRootKey in changes) sync();
  });
}
