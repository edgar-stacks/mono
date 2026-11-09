//
// This file is the entrypoint to the extension's background script
// https://developer.chrome.com/docs/extensions/mv3/architecture-overview/#background_script
import type { RpcRequests } from '@leather.io/rpc';
import { isDefined } from '@leather.io/utils';

import { listenForSessionDurationPort } from '@shared/analytics/session-duration-tracking';
import { logger } from '@shared/logger';
import { isRpcRequestEnvelope } from '@shared/rpc/is-rpc-request';
import { warnUsersAboutDevToolsDangers } from '@shared/utils/dev-tools-warning-log';
import { parseSidePanelOverlayActionMessage } from '@shared/utils/side-panel-request-overlay';

import { queueAnalyticsRequest } from './background-analytics';
import { initExtensionUpdateMonitor } from './extension-update-monitor';
import { initContextMenuActions } from './init-context-menus';
import { internalBackgroundMessageHandler } from './messaging/internal-methods/message-handler';
import { rpcMessageHandler } from './messaging/rpc-message-handler';
import { initAddressMonitor } from './monitors/address-monitor';
import { initSidePanelAvailabilitySync } from './side-panel/side-panel-availability';
import {
  handleSidePanelOverlayAction,
  listenForSidePanelRequestPorts,
  prepareSidePanelForRequest,
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

function isContentScriptSender(sender: chrome.runtime.MessageSender) {
  const isExtensionPage = sender.url?.startsWith(chrome.runtime.getURL('')) ?? false;
  return sender.id === chrome.runtime.id && isDefined(sender.tab) && !isExtensionPage;
}

function handleContentScriptMessage(message: RpcRequests, sender: chrome.runtime.MessageSender) {
  const tabId = sender.tab?.id;
  if (!tabId) return logger.error('Message reached background script without a corresponding tab');

  const overlayAction = parseSidePanelOverlayActionMessage(message);
  if (overlayAction) return handleSidePanelOverlayAction(tabId, overlayAction.method);

  if (!isRpcRequestEnvelope(message)) return;

  // Chromium/Firefox discrepancy
  const originUrl = sender.origin ?? sender.url;

  if (!originUrl)
    return logger.error('Message reached background script without a corresponding origin');

  prepareSidePanelForRequest(tabId, message);
  void rpcMessageHandler(message, { sender });
}

//
// Events from the extension frames script
chrome.runtime.onMessage.addListener((message: RpcRequests, sender, sendResponse) => {
  if (isContentScriptSender(sender)) {
    handleContentScriptMessage(message, sender);
    sendResponse();
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
