import { makeSidePanelRequestPortName, sidePanelHandOffMessage } from './side-panel';

let activeRequestPort: chrome.runtime.Port | null = null;

interface EndSidePanelRequestSessionArgs {
  isHandOff: boolean;
}
export function endSidePanelRequestSession({ isHandOff }: EndSidePanelRequestSessionArgs) {
  if (!activeRequestPort) return;
  if (isHandOff) activeRequestPort.postMessage(sidePanelHandOffMessage);
  activeRequestPort.disconnect();
  activeRequestPort = null;
}

export function startSidePanelRequestSession(tabId: number) {
  endSidePanelRequestSession({ isHandOff: true });
  const port = chrome.runtime.connect({ name: makeSidePanelRequestPortName(tabId) });
  port.onDisconnect.addListener(() => {
    if (activeRequestPort === port) activeRequestPort = null;
  });
  activeRequestPort = port;
}
