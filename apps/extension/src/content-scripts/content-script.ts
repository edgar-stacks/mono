/**
 Extensions that read or write to web pages utilize a content script. The content script
 contains JavaScript that executes in the contexts of a page that has been loaded into
 the browser. Content scripts read and modify the DOM of web pages the browser visits.
 https://developer.chrome.com/docs/extensions/mv3/architecture-overview/#contentScripts
 */
import { isPlainObject } from 'remeda';
import { z } from 'zod/mini';

import { DomEventName } from '@shared/inpage-types';
import {
  createSidePanelOverlayActionMessage,
  isHideSidePanelOverlayMessage,
  parseShowSidePanelOverlayMessage,
  sidePanelOverlayMethods,
} from '@shared/utils/side-panel-request-overlay';

import {
  hideSidePanelRequestOverlay,
  hideSidePanelRequestOverlayOnResponse,
  showSidePanelRequestOverlay,
} from './side-panel-request-overlay-card';

const inpageScriptUrl = 'inpage.js';

const rpcRequestEnvelopeSchema = z.looseObject({
  jsonrpc: z.literal('2.0'),
  id: z.string(),
  method: z.string(),
});

// Sends message to background script that an event has fired
function sendMessageToBackground(message: unknown) {
  chrome.runtime.sendMessage(message).catch(() => undefined);
}

// Receives message from background script to execute in browser
chrome.runtime.onMessage.addListener((message: unknown) => {
  const showOverlayMessage = parseShowSidePanelOverlayMessage(message);
  if (showOverlayMessage) {
    showSidePanelRequestOverlay({
      message: showOverlayMessage,
      onOpenPanel() {
        sendMessageToBackground(
          createSidePanelOverlayActionMessage(sidePanelOverlayMethods.openPanel)
        );
      },
      onDismiss() {
        sendMessageToBackground(
          createSidePanelOverlayActionMessage(sidePanelOverlayMethods.dismiss)
        );
      },
    });
    return;
  }
  if (isHideSidePanelOverlayMessage(message)) {
    hideSidePanelRequestOverlay();
    return;
  }
  if (isPlainObject(message) && message.jsonrpc === '2.0') {
    hideSidePanelRequestOverlayOnResponse(message.id);
    window.postMessage(message, window.location.origin);
  }
});

document.addEventListener(DomEventName.request, (event: Event) => {
  const request: unknown = 'detail' in event ? event.detail : undefined;
  const parsedRequest = rpcRequestEnvelopeSchema.safeParse(request);
  if (!parsedRequest.success) return;
  sendMessageToBackground(parsedRequest.data);
});

function addLeatherToPage() {
  const inpage = document.createElement('script');
  inpage.src = chrome.runtime.getURL(inpageScriptUrl);
  inpage.id = 'leather-provider';
  document.body.appendChild(inpage);
}

// Don't block thread to add Leather to page
requestAnimationFrame(() => addLeatherToPage());
