import { describe, expect, it } from 'vitest';

import {
  catalogReturnUrl,
  launchPrototypeUrl,
  parseApprovalView,
  parseWalletKind,
  prototypeUrl,
  testerUrl,
} from './journey-navigation';

function params(search: string) {
  return new URLSearchParams(search);
}

describe('prototypeUrl', () => {
  it('keeps wallet, controls and mode and sets a new run when switching journeys', () => {
    const current = params(
      'view=journeys&journey=connect&variant=first&run=old&wallet=ledger&controls=open&mode=participant'
    );
    const next = params(
      prototypeUrl(current, { journeyId: 'leather-send', variantId: 'btc' }, 'new').slice(1)
    );
    expect(next.get('journey')).toBe('leather-send');
    expect(next.get('variant')).toBe('btc');
    expect(next.get('run')).toBe('new');
    expect(next.get('wallet')).toBe('ledger');
    expect(next.get('controls')).toBe('open');
    expect(next.get('mode')).toBe('participant');
    expect(next.get('view')).toBe('journeys');
  });

  it('drops parameters that belong to the catalog', () => {
    const current = params('view=viewer&screen=connect-first');
    const next = params(
      prototypeUrl(current, { journeyId: 'connect', variantId: 'first' }, 'r1').slice(1)
    );
    expect(next.has('screen')).toBe(false);
  });
});

describe('testerUrl', () => {
  it('drops the run and sets participant mode', () => {
    const next = params(testerUrl(params('view=journeys&journey=connect&run=abc')).slice(1));
    expect(next.has('run')).toBe(false);
    expect(next.get('mode')).toBe('participant');
    expect(next.get('journey')).toBe('connect');
  });
});

describe('catalogReturnUrl', () => {
  it('falls back to the screens view when the return target is absent', () => {
    expect(catalogReturnUrl(null)).toBe('?view=screens');
    expect(catalogReturnUrl('')).toBe('?view=screens');
  });

  it('falls back for an external return target', () => {
    expect(catalogReturnUrl('https://evil.example/?view=screens')).toBe('?view=screens');
    expect(catalogReturnUrl('//evil.example')).toBe('?view=screens');
    expect(catalogReturnUrl('/playground/other')).toBe('?view=screens');
  });

  it('falls back for a recursive return target', () => {
    expect(catalogReturnUrl('?view=journeys&journey=connect')).toBe('?view=screens');
    expect(catalogReturnUrl('?view=viewer&return=%3Fview%3Dscreens')).toBe('?view=screens');
  });

  it('returns to a catalog view', () => {
    expect(catalogReturnUrl('?view=viewer&screen=connect-first')).toBe(
      '?view=viewer&screen=connect-first'
    );
  });
});

describe('launchPrototypeUrl', () => {
  it('opens the scenario and remembers the catalog to return to', () => {
    const next = params(
      launchPrototypeUrl(
        params('view=viewer&screen=send-btc&direction=handshake'),
        { journeyId: 'leather-send', variantId: 'btc' },
        'r2'
      ).slice(1)
    );
    expect(next.get('view')).toBe('journeys');
    expect(next.get('direction')).toBe('handshake');
    expect(catalogReturnUrl(next.get('return'))).toBe(
      '?view=viewer&screen=send-btc&direction=handshake'
    );
  });

  it('opens the scenario with the wallet the screen was drawn for', () => {
    const next = params(
      launchPrototypeUrl(
        params('view=screens'),
        { journeyId: 'leather-send', variantId: 'btc', wallet: 'ledger' },
        'r3'
      ).slice(1)
    );
    expect(next.get('wallet')).toBe('ledger');
  });
});

describe('parsing', () => {
  it('defaults to the screens view and the software wallet', () => {
    expect(parseApprovalView(params(''))).toBe('screens');
    expect(parseApprovalView(params('view=unknown'))).toBe('screens');
    expect(parseApprovalView(params('view=activity'))).toBe('activity');
    expect(parseWalletKind(params('wallet=paper'))).toBe('software');
    expect(parseWalletKind(params('wallet=ledger'))).toBe('ledger');
  });
});
