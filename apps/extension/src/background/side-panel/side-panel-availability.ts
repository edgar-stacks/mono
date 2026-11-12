import { z } from 'zod';

import { IS_TEST_ENV } from '@shared/environment';
import { logger } from '@shared/logger';
import { isSidePanelApiAvailable, sidePanelPagePath } from '@shared/side-panel';
import { getRootState } from '@shared/storage/get-root-state';

const persistRootStorageKey = 'persist:root';

const actionPopupPath = 'action-popup.html';

const persistedIdsSchema = z.looseObject({ ids: z.array(z.unknown()) });

const persistedRootSchema = z.looseObject({
  settings: z.looseObject({ isSidePanelModeEnabled: z.boolean().optional() }).optional(),
  wallets: persistedIdsSchema.optional(),
  softwareKeys: persistedIdsSchema.optional(),
  keychains: persistedIdsSchema.optional(),
});

export function isSidePanelModeAvailableForState(root: unknown) {
  const parsedRoot = persistedRootSchema.safeParse(root);
  if (!parsedRoot.success) return false;
  const { settings, wallets, softwareKeys, keychains } = parsedRoot.data;
  const hasWallet = [wallets, softwareKeys, keychains].some(slice => (slice?.ids.length ?? 0) > 0);
  return hasWallet && (settings?.isSidePanelModeEnabled ?? true);
}

function isSidePanelModeSupported() {
  return isSidePanelApiAvailable() && !IS_TEST_ENV && process.env.TEST_ENV !== 'true';
}

let isSidePanelModeActive = false;
let hasSyncedSidePanelAvailability = false;

export function isSidePanelRequestRoutingActive() {
  return isSidePanelModeActive;
}

async function setAllTabPanelsEnabled(enabled: boolean) {
  const tabs = await chrome.tabs.query({});
  await Promise.all(
    tabs.map(async ({ id: tabId }) => {
      if (!tabId) return;
      await chrome.sidePanel.setOptions({ tabId, path: sidePanelPagePath, enabled });
    })
  );
}

async function applySidePanelAvailability(isAvailable: boolean) {
  const isTransition = hasSyncedSidePanelAvailability && isSidePanelModeActive !== isAvailable;
  if (hasSyncedSidePanelAvailability && !isTransition) return;
  hasSyncedSidePanelAvailability = true;
  isSidePanelModeActive = isAvailable;

  await chrome.action.setPopup({ popup: isAvailable ? '' : actionPopupPath });
  await chrome.sidePanel.setOptions({ path: sidePanelPagePath, enabled: isAvailable });
  await chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: isAvailable });
  if (isTransition) await setAllTabPanelsEnabled(isAvailable);
}

function syncSidePanelAvailability(root: unknown) {
  applySidePanelAvailability(isSidePanelModeAvailableForState(root)).catch((error: unknown) =>
    logger.error('Unable to sync side panel availability', error)
  );
}

async function syncSidePanelAvailabilityFromStorage() {
  syncSidePanelAvailability(await getRootState());
}

export function initSidePanelAvailabilitySync() {
  if (!isSidePanelModeSupported()) return;

  void syncSidePanelAvailabilityFromStorage();

  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName !== 'local') return;
    const rootChange = changes[persistRootStorageKey];
    if (!rootChange) return;
    syncSidePanelAvailability(rootChange.newValue);
  });
}
