//
// This file is the entrypoint to the extension's background script
// https://developer.chrome.com/docs/extensions/mv3/architecture-overview/#background_script
import { z } from 'zod';

import type { RpcRequests } from '@leather.io/rpc';
import { isDefined } from '@leather.io/utils';

import { listenForSessionDurationPort } from '@shared/analytics/session-duration-tracking';
import { logger } from '@shared/logger';
import { warnUsersAboutDevToolsDangers } from '@shared/utils/dev-tools-warning-log';

import { queueAnalyticsRequest } from './background-analytics';
import { initExtensionUpdateMonitor } from './extension-update-monitor';
import { initContextMenuActions } from './init-context-menus';
import { internalBackgroundMessageHandler } from './messaging/internal-methods/message-handler';
import { hasRpcRequestHandler, rpcMessageHandler } from './messaging/rpc-message-handler';
import { initAddressMonitor } from './monitors/address-monitor';
import { initSidePanelAvailabilitySync } from './side-panel/side-panel-availability';
import {
  handleSidePanelOverlayAction,
  listenForSidePanelRequests,
  openSidePanelForIncomingRequest,
} from './side-panel/side-panel-requests';

initContextMenuActions();
initExtensionUpdateMonitor();
warnUsersAboutDevToolsDangers();
initSidePanelAvailabilitySync();
listenForSidePanelRequests();

chrome.runtime.onInstalled.addListener(details => {
  const reason: string = details.reason;
  if (reason === 'install' && process.env.WALLET_ENVIRONMENT !== 'testing') {
    void chrome.tabs.create({
      url: chrome.runtime.getURL(`index.html`),
    });
  }
});

const rpcRequestEnvelopeSchema = z.looseObject({
  jsonrpc: z.literal('2.0'),
  id: z.string(),
  method: z.string(),
});

const rpcRequestSchema = z.custom<RpcRequests>(
  message => rpcRequestEnvelopeSchema.safeParse(message).success
);

function isContentScriptSender(sender: chrome.runtime.MessageSender) {
  return isDefined(sender.tab) && !sender.url?.startsWith(chrome.runtime.getURL(''));
}

function handleContentScriptMessage(message: unknown, sender: chrome.runtime.MessageSender) {
  if (handleSidePanelOverlayAction(message, sender)) return;
  const parsedRequest = rpcRequestSchema.safeParse(message);
  if (!parsedRequest.success) return;
  const request = parsedRequest.data;

  const tabId = sender.tab?.id;
  if (!tabId) return logger.error('Message reached background script without a corresponding tab');

  // Chromium/Firefox discrepancy
  const originUrl = sender.origin ?? sender.url;

  if (!originUrl)
    return logger.error('Message reached background script without a corresponding origin');

  if (hasRpcRequestHandler(request.method))
    openSidePanelForIncomingRequest({
      tabId,
      method: request.method,
      params: 'params' in request ? request.params : undefined,
    });
  void rpcMessageHandler(request, { sender });
}

//
// Events from the extension frames script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
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
