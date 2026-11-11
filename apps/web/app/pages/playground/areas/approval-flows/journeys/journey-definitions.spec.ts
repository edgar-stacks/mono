import { describe, expect, it } from 'vitest';

import { captureFor } from '../captures/capture-registry';
import { approvalScreens, buildScreenRequest } from '../scenarios/approval-screens';
import { findJourney, findVariant, journeyDefinitions } from './journey-definitions';

describe('journeyDefinitions', () => {
  it('covers 19 scenario families with unique ids', () => {
    expect(journeyDefinitions).toHaveLength(19);
    expect(new Set(journeyDefinitions.map(journey => journey.id)).size).toBe(19);
  });

  it('gives every family at least one variant with unique ids', () => {
    journeyDefinitions.forEach(journey => {
      expect(journey.variants.length).toBeGreaterThan(0);
      expect(new Set(journey.variants.map(variant => variant.id)).size).toBe(
        journey.variants.length
      );
    });
  });

  it('offers BTC, STX and sBTC sends', () => {
    expect(findJourney('leather-send').variants.map(variant => variant.id)).toEqual([
      'btc',
      'stx',
      'sbtc',
    ]);
  });

  it('offers each message format', () => {
    const formats = findJourney('message-signing').variants.map(
      variant => variant.buildRequest('software').message?.format
    );
    expect(formats).toEqual(['utf8', 'structured', 'bip322']);
  });

  it('offers sign-only and broadcast for app-built transactions', () => {
    ['app-bitcoin-transaction', 'app-stacks-transaction', 'psbt-signing'].forEach(id => {
      const deliveries = findJourney(id).variants.map(
        variant => variant.buildRequest('software').delivery
      );
      expect(deliveries).toEqual(['broadcast', 'sign-only']);
    });
  });

  it('offers Bitcoin and Stacks vaults at every stage', () => {
    const vaults = findJourney('vault').variants.map(variant => {
      const request = variant.buildRequest('software');
      return `${request.vault?.chain}-${request.vault?.stage}`;
    });
    expect(vaults).toEqual([
      'bitcoin-propose',
      'bitcoin-co-sign',
      'bitcoin-broadcast',
      'stacks-propose',
      'stacks-co-sign',
      'stacks-broadcast',
    ]);
  });

  it('identifies vault funds separately from the personal signer', () => {
    const request = findVariant(findJourney('vault'), 'bitcoin-co-sign').buildRequest('ledger');
    expect(request.vault?.address).not.toBe(request.signer.address);
    expect(request.signer.kind).toBe('ledger');
  });

  it('shows no invented movements for a call without spending limits', () => {
    const request = findJourney('contract-unlimited').variants[0].buildRequest('software');
    expect(request.limits).toEqual({ mode: 'allow', rules: [] });
    expect(request.movements).toEqual([]);
  });

  it('keeps every call that moves tokens behind deny-mode limits', () => {
    journeyDefinitions.forEach(journey =>
      journey.variants.forEach(variant => {
        const request = variant.buildRequest('software');
        if (request.method !== 'stx_callContract' || request.movements.length === 0) return;
        expect(request.limits?.mode).toBe('deny');
      })
    );
  });

  it('falls back to the first family and variant for unknown ids', () => {
    const journey = findJourney('missing');
    expect(journey.id).toBe('connect');
    expect(findVariant(journey, 'missing').id).toBe('first-visit');
  });
});

describe('approvalScreens', () => {
  it('has unique ids and launches into a known journey and variant', () => {
    expect(new Set(approvalScreens.map(screen => screen.id)).size).toBe(approvalScreens.length);
    approvalScreens.forEach(screen => {
      const journey = findJourney(screen.journey);
      expect(journey.id).toBe(screen.journey);
      expect(findVariant(journey, screen.variant).id).toBe(screen.variant);
      expect(buildScreenRequest(screen).signer.kind).toBe(screen.signerKind);
    });
  });

  it('points every capture at a stored capture of the current extension', () => {
    approvalScreens.forEach(screen => {
      if (screen.captureId) expect(captureFor(screen.captureId)).toBeDefined();
    });
  });
});
