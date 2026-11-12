declare namespace chrome.sidePanel {
  interface CloseOptions {
    tabId?: number;
    windowId?: number;
  }

  const close: ((options: CloseOptions) => Promise<void>) | undefined;
}
