//
// This file is the entrypoint to the extension's background script
// https://developer.chrome.com/docs/extensions/mv3/architecture-overview/#background_script
import type { RpcRequests } from '@leather.io/rpc';

import { listenForSessionDurationPort } from '@shared/analytics/session-duration-tracking';
import { logger } from '@shared/logger';
import { warnUsersAboutDevToolsDangers } from '@shared/utils/dev-tools-warning-log';
import {
  isSidePanelOverlayDismissMessage,
  isSidePanelOverlayOpenPanelMessage,
} from '@shared/utils/side-panel-request-overlay';

import { queueAnalyticsRequest } from './background-analytics';
import { initExtensionUpdateMonitor } from './extension-update-monitor';
import { initContextMenuActions } from './init-context-menus';
import { internalBackgroundMessageHandler } from './messaging/internal-methods/message-handler';
import { rpcMessageHandler } from './messaging/rpc-message-handler';
import { initAddressMonitor } from './monitors/address-monitor';
import { initSidePanelAvailabilitySync } from './side-panel/side-panel-availability';
import {
  dismissSidePanelRequestFromOverlay,
  listenForSidePanelRequestPorts,
  openSidePanelFromOverlay,
  openSidePanelWithUserGesture,
} from './side-panel/side-panel-requests';

initContextMenuActions();
initExtensionUpdateMonitor();
warnUsersAboutDevToolsDangers();
initSidePanelAvailabilitySync();
listenForSidePanelRequestPorts();

chrome.runtime.onInstalled.addListener(details => {
  const reason: string = details.reason;
  if (reason === 'install' && process.env.WALLET_ENVIRONMENT !== 'testing') {
    void chrome.tabs.create({
      url: chrome.runtime.getURL(`index.html`),
    });
  }
});

function isFromExtension(sender: chrome.runtime.MessageSender) {
  return sender.url?.startsWith(chrome.runtime.getURL(''));
}

function handleRpcRequest(request: RpcRequests, sender: chrome.runtime.MessageSender) {
  const tabId = sender.tab?.id;
  if (!tabId) return logger.error('Message reached background script without a corresponding tab');

  // Chromium/Firefox discrepancy
  const originUrl = sender.origin ?? sender.url;

  if (!originUrl)
    return logger.error('Message reached background script without a corresponding origin');

  openSidePanelWithUserGesture(tabId, request);

  void rpcMessageHandler(request, { sender });
}

function handleContentScriptMessage(message: RpcRequests, sender: chrome.runtime.MessageSender) {
  const tabId = sender.tab?.id;
  if (isSidePanelOverlayOpenPanelMessage(message)) {
    if (tabId && sender.frameId === 0) void openSidePanelFromOverlay(tabId);
    return;
  }
  if (isSidePanelOverlayDismissMessage(message)) {
    if (tabId && sender.frameId === 0) dismissSidePanelRequestFromOverlay(tabId);
    return;
  }
  if (message.jsonrpc === '2.0') handleRpcRequest(message, sender);
}

//
// Events from the extension frames script
chrome.runtime.onMessage.addListener((message: RpcRequests, sender, sendResponse) => {
  if (!isFromExtension(sender)) {
    handleContentScriptMessage(message, sender);
    return false;
  }
  void internalBackgroundMessageHandler(message, sender, sendResponse);
  // Listener fn must return `true` to indicate the response will be async
  return true;
});

initAddressMonitor().catch(e => {
  logger.error('Unable to Initialise Address Monitor: ', e);
});

listenForSessionDurationPort({
  onSessionEnd(sessionMetadata) {
    void queueAnalyticsRequest('user_session_complete', sessionMetadata);
  },
});
