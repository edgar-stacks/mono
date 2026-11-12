import { describe, expect, test } from 'vitest';

import {
  getTabIdFromSidePanelRequestPortName,
  isSidePanelHandOffMessage,
  makeSidePanelRequestPortName,
  parseSidePanelPendingRequest,
} from './side-panel';

describe(getTabIdFromSidePanelRequestPortName.name, () => {
  test('reads the tab id back from a request port name', () => {
    expect(getTabIdFromSidePanelRequestPortName(makeSidePanelRequestPortName(42))).toEqual(42);
  });

  test.each(['content-script', 'leather-session', 'side-panel-request:', 'side-panel-request:x'])(
    'ignores %s',
    name => {
      expect(getTabIdFromSidePanelRequestPortName(name)).toBeNull();
    }
  );
});

describe(isSidePanelHandOffMessage.name, () => {
  test('only accepts the hand-off message', () => {
    expect(isSidePanelHandOffMessage({ type: 'side-panel-request/hand-off' })).toEqual(true);
    expect(isSidePanelHandOffMessage({ type: 'other' })).toEqual(false);
    expect(isSidePanelHandOffMessage(undefined)).toEqual(false);
  });
});

describe(parseSidePanelPendingRequest.name, () => {
  test('parses a pending request', () => {
    expect(parseSidePanelPendingRequest({ tabId: 3, route: '/get-addresses?tabId=3' })).toEqual({
      tabId: 3,
      route: '/get-addresses?tabId=3',
    });
  });

  test('rejects malformed values', () => {
    expect(parseSidePanelPendingRequest({ tabId: '3', route: '/' })).toBeNull();
    expect(parseSidePanelPendingRequest(undefined)).toBeNull();
  });
});
