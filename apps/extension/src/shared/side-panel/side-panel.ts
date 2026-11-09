import { z } from 'zod/mini';

export const sidePanelPagePath = 'side-panel.html';

const sidePanelRequestPortPrefix = 'side-panel-request:';

const sidePanelPendingRequestKeyPrefix = 'side-panel-pending-request:';

export const sidePanelHandOffMessage = 'side-panel-request/hand-off';

export function isSidePanelSupported() {
  return typeof chrome !== 'undefined' && typeof chrome.sidePanel?.open === 'function';
}

export function isSidePanelPage() {
  return window.location.pathname === '/' + sidePanelPagePath;
}

export function makeSidePanelRequestPortName(tabId: number) {
  return sidePanelRequestPortPrefix + tabId.toString();
}

function parseTabIdAfterPrefix(value: string, prefix: string) {
  if (!value.startsWith(prefix)) return null;
  const tabId = Number(value.slice(prefix.length));
  return Number.isInteger(tabId) && tabId > 0 ? tabId : null;
}

export function getTabIdFromSidePanelRequestPortName(name: string) {
  return parseTabIdAfterPrefix(name, sidePanelRequestPortPrefix);
}

export function makeSidePanelPendingRequestKey(tabId: number) {
  return sidePanelPendingRequestKeyPrefix + tabId.toString();
}

export function getTabIdFromSidePanelPendingRequestKey(key: string) {
  return parseTabIdAfterPrefix(key, sidePanelPendingRequestKeyPrefix);
}

export function makeSidePanelUrl(route: string) {
  return `${sidePanelPagePath}#${route}`;
}

const sidePanelPendingRequestSchema = z.object({
  route: z.string(),
  hasRequest: z.boolean(),
  createdAt: z.number(),
});
export type SidePanelPendingRequest = z.infer<typeof sidePanelPendingRequestSchema>;

export function parseSidePanelPendingRequest(value: unknown) {
  const result = sidePanelPendingRequestSchema.safeParse(value);
  return result.success ? result.data : null;
}
