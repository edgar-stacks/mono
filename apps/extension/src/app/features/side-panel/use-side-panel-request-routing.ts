import { useEffect } from 'react';

import {
  connectSidePanelRequestPort,
  handOffSidePanelToRoute,
  isSidePanelPage,
  parseSidePanelPendingRequest,
  sidePanelPendingRequestStorageKey,
} from '@shared/side-panel';

const initialSidePanelHash = window.location.hash;
let hasConnectedInitialRequest = false;

function getInitialRequestTabId() {
  const [, search = ''] = initialSidePanelHash.split('?');
  const tabId = Number(new URLSearchParams(search).get('tabId'));
  return Number.isInteger(tabId) && tabId > 0 ? tabId : null;
}

async function isRequestForActiveTab(tabId: number) {
  const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return activeTab?.id === tabId;
}

function waitForNextFrame() {
  return new Promise(resolve => requestAnimationFrame(resolve));
}

async function handlePendingRequest() {
  await waitForNextFrame();
  const items = await chrome.storage.session.get(sidePanelPendingRequestStorageKey);
  const pendingRequest = parseSidePanelPendingRequest(items[sidePanelPendingRequestStorageKey]);
  if (!pendingRequest) return;
  if (!(await isRequestForActiveTab(pendingRequest.tabId))) return;
  await chrome.storage.session.remove(sidePanelPendingRequestStorageKey);
  if (initialSidePanelHash === `#${pendingRequest.route}`) return;
  handOffSidePanelToRoute(pendingRequest.route);
}

async function connectInitialRequest() {
  const initialTabId = getInitialRequestTabId();
  if (!initialTabId || hasConnectedInitialRequest) return;
  hasConnectedInitialRequest = true;
  await waitForNextFrame();
  connectSidePanelRequestPort(initialTabId);
}

function onStorageChanged(changes: Record<string, chrome.storage.StorageChange>, areaName: string) {
  if (areaName !== 'session') return;
  const pendingRequestChange = changes[sidePanelPendingRequestStorageKey];
  if (pendingRequestChange?.newValue) void handlePendingRequest();
}

export function useSidePanelRequestRouting() {
  useEffect(() => {
    if (!isSidePanelPage()) return;

    void connectInitialRequest();
    void handlePendingRequest();
    chrome.storage.onChanged.addListener(onStorageChanged);
    return () => chrome.storage.onChanged.removeListener(onStorageChanged);
  }, []);
}
