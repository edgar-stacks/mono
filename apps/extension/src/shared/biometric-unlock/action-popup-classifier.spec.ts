import { isActionPopupWindow } from './action-popup-classifier';

describe(isActionPopupWindow.name, () => {
  test('is the action popup when the popup views contain the window', () => {
    const currentWindow = {};
    expect(isActionPopupWindow({ popupViews: [{}, currentWindow], currentWindow })).toBe(true);
  });

  test('is not the action popup when the popup views do not contain the window', () => {
    expect(isActionPopupWindow({ popupViews: [{}], currentWindow: {} })).toBe(false);
    expect(isActionPopupWindow({ popupViews: [], currentWindow: {} })).toBe(false);
  });
});
