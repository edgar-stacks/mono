import { z } from 'zod/mini';

export const sidePanelPath = 'side-panel.html';

const sidePanelRequestPortPrefix = 'side-panel-request:';

const sidePanelPendingRequestKeyPrefix = 'side-panel-pending-request:';

export const sidePanelHandOffMessage = 'side-panel-request/hand-off';

export function isSidePanelSupported() {
  return typeof chrome !== 'undefined' && 'sidePanel' in chrome && Boolean(chrome.sidePanel);
}

export function isSidePanelPage() {
  return globalThis.location?.pathname === `/${sidePanelPath}`;
}

export function makeSidePanelRequestPortName(tabId: number) {
  return `${sidePanelRequestPortPrefix}${tabId}`;
}

export function getTabIdFromSidePanelRequestPortName(name: string) {
  if (!name.startsWith(sidePanelRequestPortPrefix)) return null;
  const tabId = Number(name.slice(sidePanelRequestPortPrefix.length));
  return Number.isInteger(tabId) && tabId > 0 ? tabId : null;
}

export function makeSidePanelPendingRequestKey(tabId: number) {
  return `${sidePanelPendingRequestKeyPrefix}${tabId}`;
}

const sidePanelPendingRequestSchema = z.object({
  requestId: z.string(),
  route: z.string(),
});
export type SidePanelPendingRequest = z.infer<typeof sidePanelPendingRequestSchema>;

export function parseSidePanelPendingRequest(value: unknown) {
  const result = sidePanelPendingRequestSchema.safeParse(value);
  return result.success ? result.data : null;
}
