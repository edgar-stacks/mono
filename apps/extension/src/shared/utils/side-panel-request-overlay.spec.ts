import { RouteUrls } from '@shared/route-urls';

import {
  type SidePanelOverlayVariant,
  type SidePanelRequestCategory,
  createSidePanelOverlayDismissMessage,
  createSidePanelOverlayHideMessage,
  createSidePanelOverlayOpenPanelMessage,
  createSidePanelOverlayShowMessage,
  getSidePanelOverlayCopy,
  getSidePanelRequestCategory,
  isSidePanelOverlayDismissMessage,
  isSidePanelOverlayHideMessage,
  isSidePanelOverlayOpenPanelMessage,
  parseSidePanelOverlayShowMessage,
} from './side-panel-request-overlay';

const categories: SidePanelRequestCategory[] = [
  'connection',
  'signature',
  'transaction',
  'generic',
];
const variants: SidePanelOverlayVariant[] = ['pending', 'action-required'];

describe(getSidePanelRequestCategory.name, () => {
  it.each([
    [RouteUrls.RpcGetAddresses, 'connection'],
    [RouteUrls.RpcBtcAddAccount, 'connection'],
    [RouteUrls.RpcStxAddAccount, 'connection'],
    [RouteUrls.RpcSignPsbt, 'signature'],
    [RouteUrls.RpcSignBip322Message, 'signature'],
    [RouteUrls.RpcStacksSignature, 'signature'],
    [RouteUrls.RpcSendTransfer, 'transaction'],
    [RouteUrls.RpcStxCallContract, 'transaction'],
    [RouteUrls.RpcStxDeployContract, 'transaction'],
    [RouteUrls.RpcStxSignTransaction, 'transaction'],
    [RouteUrls.RpcStxTransferStx, 'transaction'],
    [RouteUrls.RpcStxTransferSip9Nft, 'transaction'],
    [RouteUrls.RpcStxTransferSip10Ft, 'transaction'],
    [RouteUrls.Home, 'generic'],
    ['/swap/stacks/STX/', 'generic'],
  ])('maps %s to %s', (route, category) => {
    expect(getSidePanelRequestCategory(route)).toEqual(category);
  });
});

describe(getSidePanelOverlayCopy.name, () => {
  it('gives every category its own title and description in each variant', () => {
    variants.forEach(variant => {
      const titles = categories.map(category => getSidePanelOverlayCopy(category, variant).title);
      const descriptions = categories.map(
        category => getSidePanelOverlayCopy(category, variant).description
      );
      expect(new Set(titles).size).toEqual(categories.length);
      expect(new Set(descriptions).size).toEqual(categories.length);
    });
  });

  it('names Leather in the pending titles', () => {
    categories.forEach(category => {
      expect(getSidePanelOverlayCopy(category, 'pending').title).toContain('in Leather');
    });
  });

  it('only gives the action-required variant a call to action', () => {
    categories.forEach(category => {
      expect(getSidePanelOverlayCopy(category, 'pending').callToAction).toBeUndefined();
      expect(getSidePanelOverlayCopy(category, 'action-required').callToAction).toEqual(
        'Open Leather'
      );
    });
  });

  it('uses different copy for the two variants', () => {
    categories.forEach(category => {
      expect(getSidePanelOverlayCopy(category, 'pending').title).not.toEqual(
        getSidePanelOverlayCopy(category, 'action-required').title
      );
    });
  });
});

describe('side panel overlay message guards', () => {
  it('accepts the messages it creates', () => {
    expect(
      parseSidePanelOverlayShowMessage(createSidePanelOverlayShowMessage('signature', 'pending'))
    ).toEqual(createSidePanelOverlayShowMessage('signature', 'pending'));
    expect(isSidePanelOverlayHideMessage(createSidePanelOverlayHideMessage())).toBe(true);
    expect(isSidePanelOverlayOpenPanelMessage(createSidePanelOverlayOpenPanelMessage())).toBe(true);
    expect(isSidePanelOverlayDismissMessage(createSidePanelOverlayDismissMessage())).toBe(true);
  });

  it('does not confuse one message type for another', () => {
    const show = createSidePanelOverlayShowMessage('connection', 'action-required');
    const hide = createSidePanelOverlayHideMessage();
    const openPanel = createSidePanelOverlayOpenPanelMessage();
    const dismiss = createSidePanelOverlayDismissMessage();

    expect(parseSidePanelOverlayShowMessage(hide)).toBeNull();
    expect(isSidePanelOverlayHideMessage(show)).toBe(false);
    expect(isSidePanelOverlayOpenPanelMessage(dismiss)).toBe(false);
    expect(isSidePanelOverlayDismissMessage(openPanel)).toBe(false);
  });

  it.each([
    undefined,
    null,
    'show',
    42,
    {},
    { type: 'show', category: 'connection', variant: 'pending' },
    { source: 'other-extension', type: 'show', category: 'connection', variant: 'pending' },
    { source: 'leather-side-panel-overlay', type: 'show', category: 'unknown', variant: 'pending' },
    { source: 'leather-side-panel-overlay', type: 'show', category: 'connection', variant: 'x' },
    { source: 'leather-side-panel-overlay', type: 'show' },
  ])('rejects a malformed or foreign show message: %j', message => {
    expect(parseSidePanelOverlayShowMessage(message)).toBeNull();
  });

  it.each([
    undefined,
    null,
    { type: 'hide' },
    { type: 'open-panel' },
    { type: 'dismiss' },
    { source: 'other-extension', type: 'hide' },
    { source: 'other-extension', type: 'open-panel' },
    { source: 'other-extension', type: 'dismiss' },
    { jsonrpc: '2.0', id: '1', method: 'getAddresses' },
  ])('rejects a malformed or foreign hide, open-panel or dismiss message: %j', message => {
    expect(isSidePanelOverlayHideMessage(message)).toBe(false);
    expect(isSidePanelOverlayOpenPanelMessage(message)).toBe(false);
    expect(isSidePanelOverlayDismissMessage(message)).toBe(false);
  });
});
