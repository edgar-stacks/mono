const actionPopupPathname = '/action-popup.html';

interface ClassifiableWindow {
  location: { pathname: string };
}

interface IsActionPopupWindowArgs {
  currentWindow: ClassifiableWindow;
  popupViews: readonly unknown[];
}
export function isActionPopupWindow({ currentWindow, popupViews }: IsActionPopupWindowArgs) {
  return (
    currentWindow.location.pathname === actionPopupPathname && popupViews.includes(currentWindow)
  );
}

export function isCurrentWindowActionPopup() {
  try {
    return isActionPopupWindow({
      currentWindow: window,
      popupViews: chrome.extension.getViews({ type: 'popup' }),
    });
  } catch {
    return false;
  }
}
