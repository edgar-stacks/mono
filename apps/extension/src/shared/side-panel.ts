import { z } from 'zod/mini';

import { RouteUrls } from './route-urls';

export const sidePanelPagePath = 'side-panel.html';

export const sidePanelPendingRequestStorageKey = 'side-panel-pending-request';

const sidePanelRequestPortPrefix = 'side-panel-request:';

const sidePanelHandOffMessageType = 'side-panel-request/hand-off';

export function isSidePanelApiAvailable() {
  return typeof chrome !== 'undefined' && 'sidePanel' in chrome && Boolean(chrome.sidePanel);
}

export function isSidePanelPage() {
  return document.location.pathname === `/${sidePanelPagePath}`;
}

export function makeSidePanelRequestPortName(tabId: number) {
  return `${sidePanelRequestPortPrefix}${tabId}`;
}

export function isSidePanelRequestPortName(name: string) {
  return name.startsWith(sidePanelRequestPortPrefix);
}

export function getTabIdFromSidePanelRequestPortName(name: string) {
  if (!isSidePanelRequestPortName(name)) return null;
  const tabId = Number(name.slice(sidePanelRequestPortPrefix.length));
  return Number.isInteger(tabId) && tabId > 0 ? tabId : null;
}

const sidePanelHandOffMessageSchema = z.object({ type: z.literal(sidePanelHandOffMessageType) });

export function isSidePanelHandOffMessage(message: unknown) {
  return sidePanelHandOffMessageSchema.safeParse(message).success;
}

const sidePanelPendingRequestSchema = z.object({
  tabId: z.number(),
  route: z.string(),
});

export function parseSidePanelPendingRequest(value: unknown) {
  const result = sidePanelPendingRequestSchema.safeParse(value);
  return result.success ? result.data : null;
}

let sidePanelRequestPort: chrome.runtime.Port | null = null;

export function connectSidePanelRequestPort(tabId: number) {
  sidePanelRequestPort = chrome.runtime.connect({ name: makeSidePanelRequestPortName(tabId) });
}

function reloadSidePanelAtRoute(route: string) {
  window.location.hash = route;
  window.location.reload();
}

export function handOffSidePanelToRoute(route: string) {
  sidePanelRequestPort?.postMessage({ type: sidePanelHandOffMessageType });
  reloadSidePanelAtRoute(route);
}

export function returnSidePanelToHome() {
  sidePanelRequestPort?.disconnect();
  sidePanelRequestPort = null;
  reloadSidePanelAtRoute(RouteUrls.Home);
}
