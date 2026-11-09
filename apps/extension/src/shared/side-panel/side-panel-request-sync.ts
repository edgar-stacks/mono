import { RouteUrls } from '@shared/route-urls';

import {
  type SidePanelPendingRequest,
  makeSidePanelPendingRequestKey,
  makeSidePanelRequestPortName,
  parseSidePanelPendingRequest,
  sidePanelHandOffMessage,
} from './side-panel';

let requestPort: chrome.runtime.Port | null = null;
let currentRequestId: string | null = null;

function getHashSearchParams() {
  const hash = window.location.hash;
  const searchIndex = hash.indexOf('?');
  return new URLSearchParams(searchIndex === -1 ? '' : hash.slice(searchIndex + 1));
}

async function resolvePanelTabId() {
  const tabIdParam = Number(getHashSearchParams().get('tabId'));
  if (Number.isInteger(tabIdParam) && tabIdParam > 0) return tabIdParam;
  const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return activeTab?.id ?? null;
}

interface DisconnectRequestPortArgs {
  isHandOff: boolean;
}
function disconnectRequestPort({ isHandOff }: DisconnectRequestPortArgs) {
  if (!requestPort) return;
  if (isHandOff) requestPort.postMessage(sidePanelHandOffMessage);
  requestPort.disconnect();
  requestPort = null;
}

function showPendingRequest(tabId: number, request: SidePanelPendingRequest) {
  if (request.requestId === currentRequestId) return;
  disconnectRequestPort({ isHandOff: true });
  currentRequestId = request.requestId;
  if (window.location.hash !== `#${request.route}`) window.location.hash = request.route;
  requestPort = chrome.runtime.connect({ name: makeSidePanelRequestPortName(tabId) });
}

export function returnSidePanelToHome() {
  disconnectRequestPort({ isHandOff: false });
  currentRequestId = null;
  window.location.hash = RouteUrls.Home;
}

export async function initSidePanelRequestSync() {
  const tabId = await resolvePanelTabId();
  if (!tabId) return;

  const pendingRequestKey = makeSidePanelPendingRequestKey(tabId);

  chrome.storage.session.onChanged.addListener(changes => {
    const change = changes[pendingRequestKey];
    if (!change) return;
    const pendingRequest = parseSidePanelPendingRequest(change.newValue);
    if (pendingRequest) return showPendingRequest(tabId, pendingRequest);
    if (currentRequestId) returnSidePanelToHome();
  });

  const stored = await chrome.storage.session.get(pendingRequestKey);
  const pendingRequest = parseSidePanelPendingRequest(stored[pendingRequestKey]);
  if (pendingRequest) showPendingRequest(tabId, pendingRequest);
}
