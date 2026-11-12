import { describe, expect, test } from 'vitest';

import {
  type SidePanelRequestCategory,
  createSidePanelOverlayActionMessage,
  createSidePanelOverlayHideMessage,
  createSidePanelOverlayShowMessage,
  getSidePanelOverlayCopy,
  getSidePanelRequestCategory,
  parseSidePanelOverlayAction,
  parseSidePanelOverlayCommand,
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
    ['stx_deployContract', 'transaction'],
    ['stx_signTransaction', 'transaction'],
    ['stx_transferStx', 'transaction'],
    ['stx_transferSip10Ft', 'transaction'],
    ['stx_transferSip9Nft', 'transaction'],
    ['openSwap', 'generic'],
    ['open', 'generic'],
    ['stx_addAccount', 'generic'],
  ])('maps %s to the %s category', (method, category) => {
    expect(getSidePanelRequestCategory(method)).toEqual(category);
  });
});

describe(getSidePanelOverlayCopy.name, () => {
  test('gives each category its own pending copy', () => {
    const titles = categories.map(
      category => getSidePanelOverlayCopy({ category, variant: 'pending' }).title
    );
    expect(new Set(titles).size).toEqual(categories.length);
    expect(titles).toContain('Review in Leather');
  });

  test('gives each category its own action-required copy', () => {
    const titles = categories.map(
      category => getSidePanelOverlayCopy({ category, variant: 'action-required' }).title
    );
    expect(new Set(titles).size).toEqual(categories.length);
  });

  test.each(categories)('only the action-required %s copy carries a call to action', category => {
    expect(getSidePanelOverlayCopy({ category, variant: 'pending' }).actionLabel).toBeUndefined();
    expect(getSidePanelOverlayCopy({ category, variant: 'action-required' }).actionLabel).toEqual(
      'Open Leather'
    );
  });

  test('describes the request in each copy', () => {
    expect(getSidePanelOverlayCopy({ category: 'connection', variant: 'pending' })).toEqual({
      title: 'Review connection in Leather',
      description:
        'This site wants to connect to your wallet. Approve or cancel in the Leather panel.',
    });
    expect(getSidePanelOverlayCopy({ category: 'signature', variant: 'pending' }).title).toEqual(
      'Review signature in Leather'
    );
    expect(getSidePanelOverlayCopy({ category: 'transaction', variant: 'pending' }).title).toEqual(
      'Review transaction in Leather'
    );
  });
});

describe(parseSidePanelOverlayCommand.name, () => {
  test('accepts show and hide messages', () => {
    const showMessage = createSidePanelOverlayShowMessage({
      category: 'signature',
      variant: 'action-required',
    });
    expect(parseSidePanelOverlayCommand(showMessage)).toEqual(showMessage);
    expect(parseSidePanelOverlayCommand(createSidePanelOverlayHideMessage())).toEqual(
      createSidePanelOverlayHideMessage()
    );
  });

  test.each([
    ['undefined', undefined],
    ['a string', 'show'],
    ['an rpc response', { jsonrpc: '2.0', id: '1', result: {} }],
    ['a foreign source', { source: 'other-extension', type: 'hide' }],
    ['an unknown type', { source: 'leather-side-panel-overlay', type: 'explode' }],
    [
      'an unknown category',
      { source: 'leather-side-panel-overlay', type: 'show', category: 'x', variant: 'pending' },
    ],
    [
      'an unknown variant',
      {
        source: 'leather-side-panel-overlay',
        type: 'show',
        category: 'generic',
        variant: 'loud',
      },
    ],
    ['a show message without a category', { source: 'leather-side-panel-overlay', type: 'show' }],
    ['an action message', createSidePanelOverlayActionMessage('dismiss')],
  ])('rejects %s', (_, message) => {
    expect(parseSidePanelOverlayCommand(message)).toBeNull();
  });
});

describe(parseSidePanelOverlayAction.name, () => {
  test('accepts open-panel and dismiss messages', () => {
    expect(parseSidePanelOverlayAction(createSidePanelOverlayActionMessage('open-panel'))).toEqual(
      createSidePanelOverlayActionMessage('open-panel')
    );
    expect(parseSidePanelOverlayAction(createSidePanelOverlayActionMessage('dismiss'))).toEqual(
      createSidePanelOverlayActionMessage('dismiss')
    );
  });

  test.each([
    ['null', null],
    ['an rpc request', { jsonrpc: '2.0', id: '1', method: 'getAddresses' }],
    ['a foreign source', { source: 'leather-other', type: 'dismiss' }],
    ['an unknown type', { source: 'leather-side-panel-overlay', type: 'approve' }],
    ['a hide command', createSidePanelOverlayHideMessage()],
  ])('rejects %s', (_, message) => {
    expect(parseSidePanelOverlayAction(message)).toBeNull();
  });
});
