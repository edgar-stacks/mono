import { describe, expect, test } from 'vitest';

import {
  type SidePanelRequestCategory,
  createHideSidePanelOverlayMessage,
  createShowSidePanelOverlayMessage,
  createSidePanelOverlayActionMessage,
  getSidePanelOverlayCopy,
  getSidePanelRequestCategory,
  isHideSidePanelOverlayMessage,
  parseShowSidePanelOverlayMessage,
  parseSidePanelOverlayActionMessage,
  sidePanelOverlayMethods,
  sidePanelOverlaySource,
} from './side-panel-request-overlay';

const categories: SidePanelRequestCategory[] = [
  'connection',
  'signature',
  'transaction',
  'generic',
];

describe(getSidePanelRequestCategory.name, () => {
  test.each([
    ['getAddresses', 'connection'],
    ['stx_getAddresses', 'connection'],
    ['signMessage', 'signature'],
    ['stx_signMessage', 'signature'],
    ['stx_signStructuredMessage', 'signature'],
    ['signPsbt', 'transaction'],
    ['sendTransfer', 'transaction'],
    ['stx_callContract', 'transaction'],
    ['stx_transferStx', 'transaction'],
    ['openSwap', 'generic'],
    ['open', 'generic'],
  ])('maps %s to %s', (method, category) => {
    expect(getSidePanelRequestCategory(method)).toBe(category);
  });
});

describe(getSidePanelOverlayCopy.name, () => {
  test.each(categories)('gives %s requests a distinct review title and description', category => {
    const copy = getSidePanelOverlayCopy(category, 'review');
    const otherTitles = categories
      .filter(other => other !== category)
      .map(other => getSidePanelOverlayCopy(other, 'review').title);
    expect(copy.title).toContain('in Leather');
    expect(copy.description.length).toBeGreaterThan(0);
    expect(otherTitles).not.toContain(copy.title);
  });

  test.each(categories)(
    'only the action-required variant of %s carries a call to action',
    category => {
      expect(getSidePanelOverlayCopy(category, 'review').actionLabel).toBeUndefined();
      expect(getSidePanelOverlayCopy(category, 'action-required').actionLabel).toBe('Open Leather');
    }
  );

  test('the action-required variant keeps the category title', () => {
    expect(getSidePanelOverlayCopy('signature', 'action-required').title).toBe(
      getSidePanelOverlayCopy('signature', 'review').title
    );
  });
});

describe('show and hide message guards', () => {
  const showMessage = createShowSidePanelOverlayMessage({
    requestId: 'request-1',
    category: 'connection',
    variant: 'review',
  });

  test('accept messages built by the overlay helpers', () => {
    expect(parseShowSidePanelOverlayMessage(showMessage)).toEqual(showMessage);
    expect(isHideSidePanelOverlayMessage(createHideSidePanelOverlayMessage())).toBe(true);
  });

  test('do not confuse show and hide messages', () => {
    expect(isHideSidePanelOverlayMessage(showMessage)).toBe(false);
    expect(parseShowSidePanelOverlayMessage(createHideSidePanelOverlayMessage())).toBeNull();
  });

  test.each([
    ['null', null],
    ['a string', 'side-panel-overlay/show'],
    ['an rpc response', { jsonrpc: '2.0', id: 'request-1', result: {} }],
    ['a foreign source', { ...showMessage, source: 'other-extension' }],
    ['a missing payload', { source: sidePanelOverlaySource, method: sidePanelOverlayMethods.show }],
    [
      'an unknown category',
      { ...showMessage, payload: { ...showMessage.payload, category: 'unknown' } },
    ],
    [
      'an unknown variant',
      { ...showMessage, payload: { ...showMessage.payload, variant: 'unknown' } },
    ],
  ])('reject %s', (_, message) => {
    expect(parseShowSidePanelOverlayMessage(message)).toBeNull();
    expect(isHideSidePanelOverlayMessage(message)).toBe(false);
  });
});

describe(parseSidePanelOverlayActionMessage.name, () => {
  test('accepts open-panel and dismiss messages', () => {
    expect(
      parseSidePanelOverlayActionMessage(
        createSidePanelOverlayActionMessage(sidePanelOverlayMethods.openPanel)
      )?.method
    ).toBe(sidePanelOverlayMethods.openPanel);
    expect(
      parseSidePanelOverlayActionMessage(
        createSidePanelOverlayActionMessage(sidePanelOverlayMethods.dismiss)
      )?.method
    ).toBe(sidePanelOverlayMethods.dismiss);
  });

  test.each([
    ['undefined', undefined],
    ['a show message', createHideSidePanelOverlayMessage()],
    ['a foreign source', { source: 'page', method: sidePanelOverlayMethods.dismiss }],
    ['an unknown method', { source: sidePanelOverlaySource, method: 'side-panel-overlay/other' }],
    ['an rpc request', { jsonrpc: '2.0', id: '1', method: 'getAddresses' }],
  ])('rejects %s', (_, message) => {
    expect(parseSidePanelOverlayActionMessage(message)).toBeNull();
  });
});
