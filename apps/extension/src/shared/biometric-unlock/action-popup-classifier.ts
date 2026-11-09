interface IsActionPopupWindowArgs {
  popupViews: readonly unknown[];
  currentWindow: unknown;
}
export function isActionPopupWindow({ popupViews, currentWindow }: IsActionPopupWindowArgs) {
  return popupViews.includes(currentWindow);
}

export function isCurrentWindowActionPopup() {
  try {
    return isActionPopupWindow({
      popupViews: chrome.extension.getViews({ type: 'popup' }),
      currentWindow: window,
    });
  } catch {
    return false;
  }
}
