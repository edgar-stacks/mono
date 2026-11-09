import { type RpcRequests, open } from '@leather.io/rpc';

import { logger } from '@shared/logger';
import { sendMessageToOriginatingFrame } from '@shared/messaging/send-message-to-originating-frame';
import { RouteUrls } from '@shared/route-urls';
import {
  getTabIdFromSidePanelRequestPortName,
  makeSidePanelPendingRequestKey,
  sidePanelHandOffMessage,
  sidePanelPath,
} from '@shared/side-panel/side-panel';
import {
  type SidePanelRequestCategory,
  createSidePanelOverlayHideMessage,
  createSidePanelOverlayShowMessage,
  getSidePanelRequestCategory,
} from '@shared/utils/side-panel-request-overlay';

import { popup } from '@background/popup';

import {
  canUseSidePanelMode,
  getIsSidePanelModeAvailable,
  hasSyncedSidePanelAvailability,
  readIsSidePanelModeAvailable,
  trackTabWithRequestPanel,
} from './side-panel-availability';

const sidePanelProbeDelayMs = 250;

const sidePanelRequestMethods = new Set<string>([
  'getAddresses',
  'stx_getAddresses',
  'btc_addAccount',
  'stx_addAccount',
  'signPsbt',
  'signMessage',
  'sendTransfer',
  'stx_signMessage',
  'stx_signStructuredMessage',
  'stx_signTransaction',
  'stx_callContract',
  'stx_deployContract',
  'stx_transferStx',
  'stx_transferSip9Nft',
  'stx_transferSip10Ft',
  'openSwap',
]);
const noSidePanelTabId = -1;

interface DismissResponse {
  frameId: number;
  response: unknown;
}

interface RequestAwaitingGesture {
  route: string;
  category: SidePanelRequestCategory;
  isReviewRequest: boolean;
}

const dismissResponses = new Map<number, DismissResponse>();
const gestureOpenAttempts = new Map<number, Promise<boolean>>();
const requestsAwaitingGesture = new Map<number, RequestAwaitingGesture>();
const connectedRequestPorts = new Map<number, chrome.runtime.Port>();
const handedOffPorts = new WeakSet<chrome.runtime.Port>();

function sendOverlayMessage(tabId: number, message: unknown) {
  return chrome.tabs.sendMessage(tabId, message, { frameId: 0 }).catch(() => undefined);
}

function resetTabPanelPath(tabId: number) {
  return chrome.sidePanel.setOptions({ tabId, path: sidePanelPath }).catch(() => undefined);
}

function sendDismissResponse(tabId: number) {
  const dismissResponse = dismissResponses.get(tabId);
  if (!dismissResponse) return;
  dismissResponses.delete(tabId);
  void sendMessageToOriginatingFrame(
    { tabId, frameId: dismissResponse.frameId },
    dismissResponse.response
  );
}

async function settleSidePanelRequest(tabId: number) {
  sendDismissResponse(tabId);
  requestsAwaitingGesture.delete(tabId);
  void sendOverlayMessage(tabId, createSidePanelOverlayHideMessage());
  await chrome.storage.session.remove(makeSidePanelPendingRequestKey(tabId));
  await resetTabPanelPath(tabId);
}

function wait(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function isSidePanelShowing(tabId: number) {
  if (connectedRequestPorts.has(tabId)) return true;
  await wait(sidePanelProbeDelayMs);
  if (connectedRequestPorts.has(tabId)) return true;
  const contexts = await chrome.runtime.getContexts({
    contextTypes: [chrome.runtime.ContextType.SIDE_PANEL],
  });
  return contexts.some(context => context.tabId === tabId || context.tabId === noSidePanelTabId);
}

async function attemptToOpenSidePanel(tabId: number) {
  try {
    await chrome.sidePanel.open({ tabId });
    return true;
  } catch (e) {
    logger.debug('Unable to open the side panel', e);
    return false;
  }
}

function isSidePanelRequest(request: RpcRequests) {
  if (request.method === open.method) return request.params?.mode !== 'fullpage';
  return sidePanelRequestMethods.has(request.method);
}

async function openUnlessSidePanelModeUnavailable(tabId: number) {
  const [wasOpened, isAvailable] = await Promise.all([
    attemptToOpenSidePanel(tabId),
    readIsSidePanelModeAvailable(),
  ]);
  if (isAvailable) return wasOpened;
  await chrome.sidePanel.setOptions({ tabId, enabled: false }).catch(() => undefined);
  return false;
}

export function openSidePanelWithUserGesture(tabId: number, request: RpcRequests) {
  if (!canUseSidePanelMode() || !isSidePanelRequest(request)) return;
  const hasSynced = hasSyncedSidePanelAvailability();
  if (hasSynced && !getIsSidePanelModeAvailable()) return;
  void chrome.sidePanel.setOptions({ tabId, path: sidePanelPath, enabled: true });
  trackTabWithRequestPanel(tabId);
  gestureOpenAttempts.set(
    tabId,
    hasSynced ? attemptToOpenSidePanel(tabId) : openUnlessSidePanelModeUnavailable(tabId)
  );
}

export function registerSidePanelDismissResponse(tabId: number, dismissResponse: DismissResponse) {
  dismissResponses.set(tabId, dismissResponse);
}

function showOpenedRequestOverlay(
  tabId: number,
  { category, isReviewRequest }: Omit<RequestAwaitingGesture, 'route'>
) {
  if (!isReviewRequest) {
    void sendOverlayMessage(tabId, createSidePanelOverlayHideMessage());
    return;
  }
  void sendOverlayMessage(tabId, createSidePanelOverlayShowMessage(category, 'pending'));
}

interface OpenRequestInSidePanelArgs {
  tabId: number;
  path: string;
  urlParams: URLSearchParams;
}
export async function openRequestInSidePanel({
  tabId,
  path,
  urlParams,
}: OpenRequestInSidePanelArgs) {
  sendDismissResponse(tabId);

  const route = `${path}?${urlParams.toString()}`;
  const requestId = urlParams.get('requestId') ?? route;
  const category = getSidePanelRequestCategory(path);
  const isReviewRequest = path !== RouteUrls.Home;

  await chrome.sidePanel.setOptions({ tabId, path: `${sidePanelPath}#${route}`, enabled: true });
  trackTabWithRequestPanel(tabId);
  await chrome.storage.session.set({
    [makeSidePanelPendingRequestKey(tabId)]: { requestId, route },
  });

  const gestureAttempt = gestureOpenAttempts.get(tabId);
  gestureOpenAttempts.delete(tabId);
  const wasOpened = gestureAttempt ? await gestureAttempt : false;

  if (wasOpened || (await isSidePanelShowing(tabId))) {
    requestsAwaitingGesture.delete(tabId);
    showOpenedRequestOverlay(tabId, { category, isReviewRequest });
    return;
  }

  requestsAwaitingGesture.set(tabId, { route, category, isReviewRequest });
  void sendOverlayMessage(tabId, createSidePanelOverlayShowMessage(category, 'action-required'));
}

async function fallBackToPopupWindow(tabId: number, { route }: RequestAwaitingGesture) {
  requestsAwaitingGesture.delete(tabId);
  void sendOverlayMessage(tabId, createSidePanelOverlayHideMessage());
  await chrome.storage.session.remove(makeSidePanelPendingRequestKey(tabId));
  await resetTabPanelPath(tabId);

  const popupWindow = await popup({ url: `/popup.html#${route}` });
  function onWindowRemoved(windowId: number) {
    if (windowId !== popupWindow.id) return;
    chrome.windows.onRemoved.removeListener(onWindowRemoved);
    sendDismissResponse(tabId);
  }
  chrome.windows.onRemoved.addListener(onWindowRemoved);
}

export async function openSidePanelFromOverlay(tabId: number) {
  const request = requestsAwaitingGesture.get(tabId);
  if (!request) return;
  if (await attemptToOpenSidePanel(tabId)) {
    requestsAwaitingGesture.delete(tabId);
    showOpenedRequestOverlay(tabId, request);
    return;
  }
  logger.warn('Unable to open the side panel, falling back to a popup window');
  await fallBackToPopupWindow(tabId, request);
}

export function dismissSidePanelRequestFromOverlay(tabId: number) {
  void settleSidePanelRequest(tabId);
}

export function listenForSidePanelRequestPorts() {
  chrome.runtime.onConnect.addListener(port => {
    const tabId = getTabIdFromSidePanelRequestPortName(port.name);
    if (tabId === null) return;
    if (!port.sender?.url?.startsWith(chrome.runtime.getURL(''))) return;

    connectedRequestPorts.set(tabId, port);
    port.onMessage.addListener(message => {
      if (message === sidePanelHandOffMessage) handedOffPorts.add(port);
    });
    port.onDisconnect.addListener(() => {
      if (connectedRequestPorts.get(tabId) === port) connectedRequestPorts.delete(tabId);
      if (handedOffPorts.has(port)) return;
      void settleSidePanelRequest(tabId);
    });
  });

  chrome.tabs.onRemoved.addListener(tabId => {
    dismissResponses.delete(tabId);
    gestureOpenAttempts.delete(tabId);
    requestsAwaitingGesture.delete(tabId);
    void chrome.storage.session.remove(makeSidePanelPendingRequestKey(tabId));
  });
}
