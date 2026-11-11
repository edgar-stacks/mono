import { describe, expect, it } from 'vitest';

import {
  canvasUrl,
  catalogReturnUrl,
  parseCanvasView,
  prototypeUrl,
  testerUrl,
} from './journey-navigation';

function params(search: string) {
  return new URLSearchParams(search);
}

describe(parseCanvasView.name, () => {
  it('defaults to the screens view', () => {
    expect(parseCanvasView(null)).toBe('screens');
    expect(parseCanvasView('unknown')).toBe('screens');
  });

  it('accepts known views', () => {
    expect(parseCanvasView('journeys')).toBe('journeys');
  });
});

describe(canvasUrl.name, () => {
  it('keeps the direction and drops journey state', () => {
    const current = params('direction=receipt&view=journeys&run=abc&journey=connect');
    expect(canvasUrl(current, 'viewer', { screen: 'connect-first' })).toBe(
      '?direction=receipt&view=viewer&screen=connect-first'
    );
  });
});

describe(prototypeUrl.name, () => {
  it('keeps wallet, controls and mode and sets a new run when switching journeys', () => {
    const current = params(
      'view=journeys&journey=connect&variant=first-visit&wallet=ledger&controls=open&mode=participant&run=old'
    );
    const next = params(
      prototypeUrl(current, { journey: 'leather-send', variant: 'btc' }, 'new').slice(1)
    );
    expect(next.get('wallet')).toBe('ledger');
    expect(next.get('controls')).toBe('open');
    expect(next.get('mode')).toBe('participant');
    expect(next.get('journey')).toBe('leather-send');
    expect(next.get('variant')).toBe('btc');
    expect(next.get('view')).toBe('journeys');
    expect(next.get('run')).toBe('new');
  });

  it('records where to return to and the wallet shape of a launched screen', () => {
    const next = params(
      prototypeUrl(
        params('view=screens'),
        { journey: 'connect', variant: 'returning', wallet: 'ledger', returnTo: '?view=screens' },
        'run-1'
      ).slice(1)
    );
    expect(next.get('wallet')).toBe('ledger');
    expect(next.get('return')).toBe('?view=screens');
  });
});

describe(testerUrl.name, () => {
  it('drops the run and opens a participant session', () => {
    const next = params(
      testerUrl(
        params('view=journeys&journey=connect&variant=returning&run=abc&controls=open')
      ).slice(1)
    );
    expect(next.has('run')).toBe(false);
    expect(next.has('controls')).toBe(false);
    expect(next.get('mode')).toBe('participant');
    expect(next.get('journey')).toBe('connect');
  });
});

describe(catalogReturnUrl.name, () => {
  it('returns to the recorded catalog location', () => {
    expect(catalogReturnUrl('?view=viewer&screen=send-btc')).toBe('?view=viewer&screen=send-btc');
  });

  it('falls back to the screens view for an absent target', () => {
    expect(catalogReturnUrl(null)).toBe('?view=screens');
    expect(catalogReturnUrl('')).toBe('?view=screens');
  });

  it('falls back to the screens view for an external target', () => {
    expect(catalogReturnUrl('https://example.com/?view=screens')).toBe('?view=screens');
    expect(catalogReturnUrl('//example.com')).toBe('?view=screens');
  });

  it('falls back to the screens view for a recursive target', () => {
    expect(catalogReturnUrl('?view=screens&return=%3Fview%3Dscreens')).toBe('?view=screens');
    expect(catalogReturnUrl('?view=journeys&journey=connect')).toBe('?view=screens');
  });
});
