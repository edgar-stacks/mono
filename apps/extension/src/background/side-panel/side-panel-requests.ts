import { logger } from '@shared/logger';
import { sendMessageToOriginatingFrame } from '@shared/messaging/send-message-to-originating-frame';
import { RouteUrls } from '@shared/route-urls';
import {
  getTabIdFromSidePanelRequestPortName,
  isSidePanelSupported,
  makeSidePanelPendingRequestKey,
  makeSidePanelUrl,
  sidePanelHandOffMessage,
  sidePanelPagePath,
} from '@shared/side-panel/side-panel';
import { isRecord } from '@shared/utils/is-record';
import {
  type SidePanelOverlayVariant,
  createHideSidePanelOverlayMessage,
  createShowSidePanelOverlayMessage,
  getSidePanelRequestCategory,
  sidePanelOverlayMethods,
} from '@shared/utils/side-panel-request-overlay';

import { popup } from '@background/popup';

import {
  getIsSidePanelModeActive,
  isSidePanelModeActiveNow,
  isSidePanelModeInactiveNow,
  trackTabWithRequestPanel,
} from './side-panel-availability';

const topFrameId = 0;

const sidePanelContextProbeDelayMs = 150;

const methodsWithoutSidePanelUi = new Set(['supportedMethods']);

const methodsResolvedOnOpen = new Set(['open', 'openSwap']);

interface SidePanelRequestContext {
  requestId: string;
  method: string;
  openAttempt: Promise<boolean>;
}

interface ActionRequiredRequest {
  route: string;
  requestId: string;
  method: string;
}

interface SidePanelDismissResponse {
  frameId: number;
  response: unknown;
}

const requestContexts = new Map<number, SidePanelRequestContext>();
const dismissResponses = new Map<number, SidePanelDismissResponse>();
const actionRequiredRequests = new Map<number, ActionRequiredRequest>();
const tabsWithRequestPanelPath = new Set<number>();

interface SidePanelRequestMetadata {
  id: string;
  method: string;
  params?: unknown;
}

function isFullPageOpenRequest({ method, params }: SidePanelRequestMetadata) {
  return method === 'open' && isRecord(params) && params.mode === 'fullpage';
}

async function requestPanelOpen(tabId: number) {
  const optionsUpdate = chrome.sidePanel.setOptions({
    tabId,
    path: sidePanelPagePath,
    enabled: true,
  });
  const openRequest = chrome.sidePanel.open({ tabId });
  trackTabWithRequestPanel(tabId);
  try {
    await Promise.all([optionsUpdate, openRequest]);
    return true;
  } catch {
    return false;
  }
}

async function requestPanelOpenBeforeSync(tabId: number) {
  const openRequest = chrome.sidePanel.open({ tabId });
  try {
    await openRequest;
  } catch {
    return false;
  }
  return getIsSidePanelModeActive();
}

export function prepareSidePanelForRequest(tabId: number, request: SidePanelRequestMetadata) {
  if (!isSidePanelSupported() || isSidePanelModeInactiveNow()) return;
  if (methodsWithoutSidePanelUi.has(request.method) || isFullPageOpenRequest(request)) return;
  requestContexts.set(tabId, {
    requestId: request.id,
    method: request.method,
    openAttempt: isSidePanelModeActiveNow()
      ? requestPanelOpen(tabId)
      : requestPanelOpenBeforeSync(tabId),
  });
}

function sendOverlayMessageToTab(tabId: number, message: unknown) {
  return chrome.tabs.sendMessage(tabId, message, { frameId: topFrameId }).catch(() => undefined);
}

interface OverlayRequest {
  requestId: string;
  method: string;
}

function showOverlay(tabId: number, context: OverlayRequest, variant: SidePanelOverlayVariant) {
  if (variant === 'review' && methodsResolvedOnOpen.has(context.method)) return;
  void sendOverlayMessageToTab(
    tabId,
    createShowSidePanelOverlayMessage({
      requestId: context.requestId,
      category: getSidePanelRequestCategory(context.method),
      variant,
    })
  );
}

function hideOverlay(tabId: number) {
  void sendOverlayMessageToTab(tabId, createHideSidePanelOverlayMessage());
}

function wait(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function isSidePanelShowing() {
  await wait(sidePanelContextProbeDelayMs);
  const contexts = await chrome.runtime.getContexts({
    contextTypes: [chrome.runtime.ContextType.SIDE_PANEL],
  });
  return contexts.length > 0;
}

async function writePendingRequest(tabId: number, route: string, hasRequest: boolean) {
  await chrome.storage.session.set({
    [makeSidePanelPendingRequestKey(tabId)]: { route, hasRequest, createdAt: Date.now() },
  });
}

async function setRequestPanelPath(tabId: number, route: string) {
  await chrome.sidePanel.setOptions({ tabId, path: makeSidePanelUrl(route), enabled: true });
  tabsWithRequestPanelPath.add(tabId);
  trackTabWithRequestPanel(tabId);
}

async function resetRequestPanelPath(tabId: number) {
  if (!tabsWithRequestPanelPath.delete(tabId)) return;
  await chrome.sidePanel.setOptions({ tabId, path: sidePanelPagePath }).catch(() => undefined);
}

async function shouldUseSidePanel(tabId: number) {
  if (!isSidePanelSupported() || tabId <= 0) return false;
  return getIsSidePanelModeActive();
}

function getRequestContext(tabId: number, urlParams: URLSearchParams) {
  const context = requestContexts.get(tabId);
  requestContexts.delete(tabId);
  if (context) return context;
  return {
    requestId: urlParams.get('requestId') ?? '',
    method: '',
    openAttempt: Promise.resolve(false),
  };
}

export async function openRequestInSidePanel(route: string, urlParams: URLSearchParams) {
  const tabId = Number(urlParams.get('tabId'));
  if (!(await shouldUseSidePanel(tabId))) {
    requestContexts.delete(tabId);
    return false;
  }

  const context = getRequestContext(tabId, urlParams);
  const isPanelOpen = await context.openAttempt;
  try {
    await writePendingRequest(tabId, route, true);
    if (isPanelOpen || (await isSidePanelShowing())) {
      showOverlay(tabId, context, 'review');
      return true;
    }
    await setRequestPanelPath(tabId, route);
  } catch (error) {
    logger.error('Unable to route request to the side panel', error);
    return false;
  }

  actionRequiredRequests.set(tabId, {
    route,
    requestId: context.requestId,
    method: context.method,
  });
  showOverlay(tabId, context, 'action-required');
  return true;
}

function sendDismissResponse(tabId: number) {
  const entry = dismissResponses.get(tabId);
  dismissResponses.delete(tabId);
  if (!entry) return;
  void sendMessageToOriginatingFrame({ frameId: entry.frameId, tabId }, entry.response);
}

export function registerSidePanelDismissResponse(tabId: number, entry: SidePanelDismissResponse) {
  sendDismissResponse(tabId);
  dismissResponses.set(tabId, entry);
}

function settleSidePanelRequest(tabId: number) {
  actionRequiredRequests.delete(tabId);
  hideOverlay(tabId);
  sendDismissResponse(tabId);
  void resetRequestPanelPath(tabId);
}

async function openActionRequiredRequestInPopup(tabId: number, route: string) {
  const popupWindow = await popup({ url: `/popup.html#${route}` });
  chrome.windows.onRemoved.addListener(function onRemoved(windowId) {
    if (windowId !== popupWindow.id) return;
    chrome.windows.onRemoved.removeListener(onRemoved);
    sendDismissResponse(tabId);
  });
}

async function openPanelFromOverlay(tabId: number) {
  const request = actionRequiredRequests.get(tabId);
  actionRequiredRequests.delete(tabId);
  const pathReset = resetRequestPanelPath(tabId);
  const openRequest = chrome.sidePanel.open({ tabId });
  hideOverlay(tabId);
  try {
    await Promise.all([pathReset, openRequest]);
    if (request) showOverlay(tabId, request, 'review');
  } catch {
    if (!request) return;
    await openActionRequiredRequestInPopup(tabId, request.route);
  }
}

function dismissFromOverlay(tabId: number) {
  settleSidePanelRequest(tabId);
  void writePendingRequest(tabId, RouteUrls.Home, false);
}

export function handleSidePanelOverlayAction(tabId: number, method: string) {
  if (method === sidePanelOverlayMethods.openPanel) return void openPanelFromOverlay(tabId);
  if (method === sidePanelOverlayMethods.dismiss) return dismissFromOverlay(tabId);
}

function isExtensionPagePort(port: chrome.runtime.Port) {
  return port.sender?.url?.startsWith(chrome.runtime.getURL('')) ?? false;
}

export function listenForSidePanelRequestPorts() {
  if (!isSidePanelSupported()) return;

  chrome.runtime.onConnect.addListener(port => {
    const tabId = getTabIdFromSidePanelRequestPortName(port.name);
    if (!tabId || !isExtensionPagePort(port)) return;

    let isHandOff = false;
    port.onMessage.addListener((message: unknown) => {
      if (message === sidePanelHandOffMessage) isHandOff = true;
    });
    port.onDisconnect.addListener(() => {
      if (isHandOff) return;
      settleSidePanelRequest(tabId);
    });
  });

  chrome.tabs.onRemoved.addListener(tabId => {
    requestContexts.delete(tabId);
    dismissResponses.delete(tabId);
    actionRequiredRequests.delete(tabId);
    tabsWithRequestPanelPath.delete(tabId);
    void chrome.storage.session.remove(makeSidePanelPendingRequestKey(tabId));
  });
}
