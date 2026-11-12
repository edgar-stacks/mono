import { isPlainObject } from 'remeda';

import { logger } from '@shared/logger';
import { sendMessageToOriginatingFrame } from '@shared/messaging/send-message-to-originating-frame';
import { RouteUrls } from '@shared/route-urls';
import {
  getTabIdFromSidePanelRequestPortName,
  isSidePanelHandOffMessage,
  parseSidePanelPendingRequest,
  sidePanelPagePath,
  sidePanelPendingRequestStorageKey,
} from '@shared/side-panel';
import {
  type SidePanelOverlayVariant,
  type SidePanelRequestCategory,
  createSidePanelOverlayHideMessage,
  createSidePanelOverlayShowMessage,
  getSidePanelRequestCategory,
  parseSidePanelOverlayAction,
} from '@shared/utils/side-panel-request-overlay';

import { popup } from '@background/popup';

import { isSidePanelRequestRoutingActive } from './side-panel-availability';

const sidePanelOpenProbeDelayMs = 150;

const topFrameId = 0;

interface SidePanelDismissResponse {
  frameId: number;
  response: unknown;
}

interface SidePanelRequest {
  route: string;
  category: SidePanelRequestCategory;
  dismissResponse?: SidePanelDismissResponse;
}

const sidePanelRequests = new Map<number, SidePanelRequest>();

const gestureOpenAttempts = new Map<number, Promise<boolean>>();

const requestMethodsByTab = new Map<number, string>();

const requestPortsByTab = new Map<number, chrome.runtime.Port>();

function logOverlayDeliveryFailure(error: unknown) {
  logger.warn('Unable to reach the side panel request overlay', error);
}

function showSidePanelOverlay(tabId: number, variant: SidePanelOverlayVariant) {
  const request = sidePanelRequests.get(tabId);
  if (!request) return;
  chrome.tabs
    .sendMessage(
      tabId,
      createSidePanelOverlayShowMessage({ category: request.category, variant }),
      { frameId: topFrameId }
    )
    .catch(logOverlayDeliveryFailure);
}

function hideSidePanelOverlay(tabId: number) {
  chrome.tabs
    .sendMessage(tabId, createSidePanelOverlayHideMessage(), { frameId: topFrameId })
    .catch(logOverlayDeliveryFailure);
}

function sendDismissResponse(tabId: number, dismissResponse?: SidePanelDismissResponse) {
  if (!dismissResponse) return;
  void sendMessageToOriginatingFrame(
    { frameId: dismissResponse.frameId, tabId },
    dismissResponse.response
  );
}

async function clearPendingSidePanelRoute(tabId: number) {
  const items = await chrome.storage.session.get(sidePanelPendingRequestStorageKey);
  const pendingRequest = parseSidePanelPendingRequest(items[sidePanelPendingRequestStorageKey]);
  if (pendingRequest?.tabId === tabId)
    await chrome.storage.session.remove(sidePanelPendingRequestStorageKey);
  if (isSidePanelRequestRoutingActive())
    await chrome.sidePanel.setOptions({ tabId, path: sidePanelPagePath });
}

function settleSidePanelRequest(tabId: number) {
  const request = sidePanelRequests.get(tabId);
  if (!request) return;
  sidePanelRequests.delete(tabId);
  hideSidePanelOverlay(tabId);
  sendDismissResponse(tabId, request.dismissResponse);
  clearPendingSidePanelRoute(tabId).catch((error: unknown) =>
    logger.error('Unable to reset the side panel after a request', error)
  );
}

async function attemptSidePanelOpen(tabId: number) {
  try {
    await chrome.sidePanel.open({ tabId });
    return true;
  } catch {
    return false;
  }
}

function shouldOpenSidePanelForRequest(method: string, params: unknown) {
  if (method === 'supportedMethods') return false;
  if (method !== 'open') return true;
  return !isPlainObject(params) || params.mode !== 'fullpage';
}

interface OpenSidePanelForIncomingRequestArgs {
  tabId: number;
  method: string;
  params: unknown;
}
export function openSidePanelForIncomingRequest({
  tabId,
  method,
  params,
}: OpenSidePanelForIncomingRequestArgs) {
  requestMethodsByTab.set(tabId, method);
  if (!isSidePanelRequestRoutingActive() || !shouldOpenSidePanelForRequest(method, params)) return;
  gestureOpenAttempts.set(tabId, attemptSidePanelOpen(tabId));
}

async function isSidePanelShowingAfterFailedOpen() {
  await new Promise(resolve => setTimeout(resolve, sidePanelOpenProbeDelayMs));
  const contexts = await chrome.runtime.getContexts({
    contextTypes: [chrome.runtime.ContextType.SIDE_PANEL],
  });
  return contexts.length > 0;
}

function isHomeRoute(route: string) {
  return route === RouteUrls.Home || route.startsWith(`${RouteUrls.Home}?`);
}

interface RouteRequestToSidePanelArgs {
  tabId: number;
  route: string;
}
export async function routeRequestToSidePanel({ tabId, route }: RouteRequestToSidePanelArgs) {
  if (!isSidePanelRequestRoutingActive() || !Number.isInteger(tabId) || tabId <= 0) return false;

  const supersededRequest = sidePanelRequests.get(tabId);
  sendDismissResponse(tabId, supersededRequest?.dismissResponse);

  const method = requestMethodsByTab.get(tabId) ?? '';
  sidePanelRequests.set(tabId, { route, category: getSidePanelRequestCategory(method) });

  await chrome.sidePanel.setOptions({
    tabId,
    path: `${sidePanelPagePath}#${route}`,
    enabled: true,
  });
  await chrome.storage.session.set({ [sidePanelPendingRequestStorageKey]: { tabId, route } });

  const gestureOpenAttempt = gestureOpenAttempts.get(tabId);
  gestureOpenAttempts.delete(tabId);
  const isOpenedByGesture = gestureOpenAttempt ? await gestureOpenAttempt : false;
  const isShowing = isOpenedByGesture || (await isSidePanelShowingAfterFailedOpen());

  if (!isShowing) showSidePanelOverlay(tabId, 'action-required');
  else if (!isHomeRoute(route)) showSidePanelOverlay(tabId, 'pending');
  return true;
}

interface RegisterSidePanelDismissResponseArgs {
  tabId: number;
  frameId: number;
  response: unknown;
}
export function registerSidePanelDismissResponse({
  tabId,
  frameId,
  response,
}: RegisterSidePanelDismissResponseArgs) {
  const request = sidePanelRequests.get(tabId);
  if (!request) return;
  request.dismissResponse = { frameId, response };
}

async function openRequestInPopupWindow(tabId: number) {
  const request = sidePanelRequests.get(tabId);
  if (!request) return;
  hideSidePanelOverlay(tabId);
  await clearPendingSidePanelRoute(tabId);
  const requestWindow = await popup({ url: `/popup.html#${request.route}` });
  chrome.windows.onRemoved.addListener(function onRequestWindowRemoved(windowId) {
    if (windowId !== requestWindow.id) return;
    chrome.windows.onRemoved.removeListener(onRequestWindowRemoved);
    settleSidePanelRequest(tabId);
  });
}

async function closeSidePanelForTab(tabId: number) {
  const { windowId } = await chrome.tabs.get(tabId);
  if (chrome.sidePanel.close) {
    await chrome.sidePanel.close({ windowId });
    return;
  }
  await chrome.sidePanel.setOptions({ tabId, enabled: false });
  if (isSidePanelRequestRoutingActive())
    await chrome.sidePanel.setOptions({ tabId, path: sidePanelPagePath, enabled: true });
}

async function openSidePanelFromOverlay(tabId: number) {
  const isOpened = await attemptSidePanelOpen(tabId);
  if (isOpened) return showSidePanelOverlay(tabId, 'pending');
  await openRequestInPopupWindow(tabId);
}

function dismissSidePanelRequest(tabId: number) {
  settleSidePanelRequest(tabId);
  closeSidePanelForTab(tabId).catch((error: unknown) =>
    logger.error('Unable to close the side panel', error)
  );
}

export function handleSidePanelOverlayAction(
  message: unknown,
  sender: chrome.runtime.MessageSender
) {
  const action = parseSidePanelOverlayAction(message);
  if (!action) return false;
  const tabId = sender.tab?.id;
  if (!tabId) return true;
  if (!sidePanelRequests.has(tabId)) {
    hideSidePanelOverlay(tabId);
    return true;
  }
  if (action.type === 'open-panel')
    openSidePanelFromOverlay(tabId).catch((error: unknown) =>
      logger.error('Unable to open the request from the overlay', error)
    );
  else dismissSidePanelRequest(tabId);
  return true;
}

function isExtensionPageSender(sender?: chrome.runtime.MessageSender) {
  return sender?.id === chrome.runtime.id && sender.url?.startsWith(chrome.runtime.getURL(''));
}

export function listenForSidePanelRequests() {
  chrome.runtime.onConnect.addListener(port => {
    const tabId = getTabIdFromSidePanelRequestPortName(port.name);
    if (!tabId || !isExtensionPageSender(port.sender)) return;

    requestPortsByTab.set(tabId, port);
    let isHandedOff = false;
    port.onMessage.addListener(message => {
      if (isSidePanelHandOffMessage(message)) isHandedOff = true;
    });
    port.onDisconnect.addListener(() => {
      if (requestPortsByTab.get(tabId) !== port) return;
      requestPortsByTab.delete(tabId);
      if (!isHandedOff) settleSidePanelRequest(tabId);
    });
  });

  chrome.tabs.onRemoved.addListener(tabId => {
    sidePanelRequests.delete(tabId);
    gestureOpenAttempts.delete(tabId);
    requestMethodsByTab.delete(tabId);
    requestPortsByTab.delete(tabId);
  });
}
