import { isActionPopupWindow, isCurrentWindowActionPopup } from './action-popup-classifier';

describe(isActionPopupWindow.name, () => {
  const currentWindow = {};

  test('is the action popup when the window is a popup view on the action popup page', () => {
    expect(
      isActionPopupWindow({
        pathname: '/action-popup.html',
        popupViews: [currentWindow],
        currentWindow,
      })
    ).toBe(true);
  });

  test('is not the action popup when the browser does not list the window as a popup', () => {
    expect(
      isActionPopupWindow({ pathname: '/action-popup.html', popupViews: [{}], currentWindow })
    ).toBe(false);
  });

  test('is not the action popup on the request popup or full page', () => {
    expect(
      isActionPopupWindow({ pathname: '/popup.html', popupViews: [currentWindow], currentWindow })
    ).toBe(false);
    expect(
      isActionPopupWindow({ pathname: '/index.html', popupViews: [currentWindow], currentWindow })
    ).toBe(false);
  });
});

describe(isCurrentWindowActionPopup.name, () => {
  test('is false when the classification cannot run', () => {
    expect(isCurrentWindowActionPopup()).toBe(false);
  });
});
