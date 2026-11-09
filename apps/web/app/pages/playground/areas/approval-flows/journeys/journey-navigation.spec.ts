import { describe, expect, test } from 'vitest';

import {
  catalogReturnUrl,
  prototypeUrl,
  readApprovalFlowParams,
  testerUrl,
  viewUrl,
} from './journey-navigation';

describe('readApprovalFlowParams', () => {
  test('defaults to the screens view and a software wallet', () => {
    const params = readApprovalFlowParams(new URLSearchParams());
    expect(params.view).toBe('screens');
    expect(params.wallet).toBe('software');
    expect(params.participant).toBe(false);
    expect(params.controls).toBe(true);
  });

  test('ignores unknown views', () => {
    expect(readApprovalFlowParams(new URLSearchParams('view=nope')).view).toBe('screens');
  });

  test('reads tester sessions', () => {
    expect(readApprovalFlowParams(new URLSearchParams('mode=participant')).participant).toBe(true);
  });
});

describe('prototypeUrl', () => {
  test('keeps wallet, controls and mode, and sets a new run', () => {
    const current = new URLSearchParams(
      'view=journeys&journey=connect&run=old&wallet=ledger&controls=hidden&mode=participant&screen=x'
    );
    const next = new URLSearchParams(
      prototypeUrl(current, { journey: 'message-signing', variant: 'bip322', run: 'new' })
    );
    expect(next.get('view')).toBe('journeys');
    expect(next.get('journey')).toBe('message-signing');
    expect(next.get('variant')).toBe('bip322');
    expect(next.get('run')).toBe('new');
    expect(next.get('wallet')).toBe('ledger');
    expect(next.get('controls')).toBe('hidden');
    expect(next.get('mode')).toBe('participant');
    expect(next.has('screen')).toBe(false);
  });

  test('carries the catalog return target', () => {
    const next = new URLSearchParams(
      prototypeUrl(new URLSearchParams('view=screens'), {
        journey: 'connect',
        run: 'r',
        returnTo: '?view=screens&direction=handshake',
      })
    );
    expect(next.get('return')).toBe('?view=screens&direction=handshake');
  });
});

describe('testerUrl', () => {
  test('drops the run and sets participant mode', () => {
    const next = new URLSearchParams(
      testerUrl(new URLSearchParams('view=journeys&journey=connect&run=abc&wallet=ledger'))
    );
    expect(next.has('run')).toBe(false);
    expect(next.get('mode')).toBe('participant');
    expect(next.get('journey')).toBe('connect');
    expect(next.get('wallet')).toBe('ledger');
  });
});

describe('catalogReturnUrl', () => {
  test('returns to a catalog target', () => {
    expect(catalogReturnUrl('?view=viewer&screen=connect-first')).toBe(
      '?view=viewer&screen=connect-first'
    );
  });

  test.each([
    ['absent', null],
    ['external', 'https://example.com/?view=screens'],
    ['protocol-relative', '//example.com'],
    ['recursive journey', '?view=journeys&journey=connect'],
    ['nested return', '?view=screens&return=%3Fview%3Dscreens'],
  ])('falls back to the screens view for an %s target', (_label, target) => {
    expect(catalogReturnUrl(target)).toBe('?view=screens');
  });
});

describe('viewUrl', () => {
  test('switches view and keeps the rest', () => {
    const next = new URLSearchParams(
      viewUrl(new URLSearchParams('direction=handshake'), 'viewer', { screen: 'connect-first' })
    );
    expect(next.get('view')).toBe('viewer');
    expect(next.get('screen')).toBe('connect-first');
    expect(next.get('direction')).toBe('handshake');
  });
});
