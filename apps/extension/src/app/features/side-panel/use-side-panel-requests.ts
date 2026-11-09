import { useEffect } from 'react';
import { useNavigate } from 'react-router';

import { entries } from 'remeda';

import {
  type SidePanelPendingRequest,
  getTabIdFromSidePanelPendingRequestKey,
  isSidePanelPage,
  makeSidePanelPendingRequestKey,
  parseSidePanelPendingRequest,
} from '@shared/side-panel/side-panel';
import {
  endSidePanelRequestSession,
  startSidePanelRequestSession,
} from '@shared/side-panel/side-panel-request-session';

import { useIsSidePanelModeEnabled } from '@app/store/settings/settings.selectors';

const initialHash = window.location.hash;

function isDocumentLoadedAtRoute(route: string) {
  return new URL(`#${route}`, window.location.href).hash === initialHash;
}

function reloadAtRoute(route: string) {
  endSidePanelRequestSession({ isHandOff: true });
  window.history.replaceState(null, '', `#${route}`);
  window.location.reload();
}

async function getPanelTabId() {
  const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return activeTab?.id ?? null;
}

export function useSidePanelRequests() {
  const navigate = useNavigate();
  const isSidePanelModeEnabled = useIsSidePanelModeEnabled();
  const isPanel = isSidePanelPage();

  useEffect(() => {
    if (isPanel && !isSidePanelModeEnabled) window.close();
  }, [isPanel, isSidePanelModeEnabled]);

  useEffect(() => {
    if (!isPanel) return;

    async function consumePendingRequest(tabId: number, pendingRequest: SidePanelPendingRequest) {
      if (pendingRequest.hasRequest && !isDocumentLoadedAtRoute(pendingRequest.route))
        return reloadAtRoute(pendingRequest.route);
      await chrome.storage.session.remove(makeSidePanelPendingRequestKey(tabId));
      if (pendingRequest.hasRequest) return startSidePanelRequestSession(tabId);
      endSidePanelRequestSession({ isHandOff: true });
      void navigate(pendingRequest.route, { replace: true });
    }

    async function consumeStoredPendingRequest() {
      const tabId = await getPanelTabId();
      if (!tabId) return;
      const key = makeSidePanelPendingRequestKey(tabId);
      const storage = await chrome.storage.session.get(key);
      const pendingRequest = parseSidePanelPendingRequest(storage[key]);
      if (pendingRequest) await consumePendingRequest(tabId, pendingRequest);
    }

    async function onStorageChanged(
      changes: Record<string, chrome.storage.StorageChange>,
      areaName: string
    ) {
      if (areaName !== 'session') return;
      const panelTabId = await getPanelTabId();
      for (const [key, change] of entries(changes)) {
        const pendingRequest = parseSidePanelPendingRequest(change.newValue);
        const tabId = getTabIdFromSidePanelPendingRequestKey(key);
        if (pendingRequest && tabId && tabId === panelTabId)
          await consumePendingRequest(tabId, pendingRequest);
      }
    }

    function handleStorageChanged(
      changes: Record<string, chrome.storage.StorageChange>,
      areaName: string
    ) {
      void onStorageChanged(changes, areaName);
    }

    void consumeStoredPendingRequest();
    chrome.storage.onChanged.addListener(handleStorageChanged);
    return () => chrome.storage.onChanged.removeListener(handleStorageChanged);
  }, [isPanel, navigate]);
}
