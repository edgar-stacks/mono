import { isActionPopupWindow } from './action-popup-classifier';

function makeWindow(pathname: string) {
  return { location: { pathname } };
}

describe(isActionPopupWindow.name, () => {
  test('is a real action popup when the browser lists the window as a popup view', () => {
    const currentWindow = makeWindow('/action-popup.html');
    expect(isActionPopupWindow({ currentWindow, popupViews: [currentWindow] })).toBe(true);
  });

  test('is not a real action popup when the page was opened in a tab', () => {
    const currentWindow = makeWindow('/action-popup.html');
    expect(isActionPopupWindow({ currentWindow, popupViews: [] })).toBe(false);
    expect(
      isActionPopupWindow({ currentWindow, popupViews: [makeWindow('/action-popup.html')] })
    ).toBe(false);
  });

  test('is not an action popup for other extension pages', () => {
    const currentWindow = makeWindow('/popup.html');
    expect(isActionPopupWindow({ currentWindow, popupViews: [currentWindow] })).toBe(false);
    const fullPage = makeWindow('/index.html');
    expect(isActionPopupWindow({ currentWindow: fullPage, popupViews: [fullPage] })).toBe(false);
  });
});
