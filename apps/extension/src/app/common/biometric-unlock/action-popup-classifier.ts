const actionPopupPathname = '/action-popup.html';

interface IsActionPopupWindowArgs {
  pathname: string;
  popupViews: readonly unknown[];
  currentWindow: unknown;
}
export function isActionPopupWindow({
  pathname,
  popupViews,
  currentWindow,
}: IsActionPopupWindowArgs) {
  return pathname.startsWith(actionPopupPathname) && popupViews.includes(currentWindow);
}

export function isCurrentWindowActionPopup() {
  try {
    return isActionPopupWindow({
      pathname: window.location.pathname,
      popupViews: chrome.extension.getViews({ type: 'popup' }),
      currentWindow: window,
    });
  } catch {
    return false;
  }
}
