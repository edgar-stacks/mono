import { describe, expect, it } from 'vitest';

import { journeyDefinitions, requestNeedsTransaction, resolveJourney } from './journey-definitions';

const allVariants = journeyDefinitions.flatMap(definition =>
  definition.variants.map(variant => ({ definition, variant }))
);

describe('journeyDefinitions', () => {
  it('registers nineteen scenario families with unique ids', () => {
    const ids = journeyDefinitions.map(definition => definition.id);
    expect(ids).toHaveLength(19);
    expect(new Set(ids).size).toBe(19);
  });

  it('gives every family unique variant ids', () => {
    journeyDefinitions.forEach(definition => {
      const ids = definition.variants.map(variant => variant.id);
      expect(new Set(ids).size).toBe(ids.length);
    });
  });

  it('covers BTC, STX and sBTC sends', () => {
    const send = resolveJourney('leather-send', null).definition;
    expect(send.variants.map(variant => variant.id)).toEqual(['btc', 'stx', 'sbtc']);
  });

  it('covers every message format', () => {
    const formats = resolveJourney('sign-message', null).definition.variants.map(
      variant => variant.request.message?.format
    );
    expect(formats).toEqual(['utf8', 'structured', 'bip322']);
  });

  it('covers sign-only and broadcast', () => {
    const modes = resolveJourney('psbt', null).definition.variants.map(
      variant => variant.request.mode
    );
    expect(modes).toEqual(['sign-only', 'broadcast']);
  });

  it('covers Bitcoin and Stacks vaults through every step', () => {
    const vault = resolveJourney('vault', null).definition;
    expect(vault.variants.map(variant => variant.id)).toEqual([
      'bitcoin-propose',
      'bitcoin-co-sign',
      'bitcoin-broadcast',
      'stacks-propose',
      'stacks-co-sign',
      'stacks-broadcast',
    ]);
  });

  it('keeps vault funds separate from the personal signer', () => {
    resolveJourney('vault', null).definition.variants.forEach(variant => {
      expect(variant.request.accountId).not.toBe('personal');
      expect(variant.request.feePayer).toBe(variant.request.accountId);
    });
  });

  it('only broadcasts the final vault step', () => {
    const broadcasting = resolveJourney('vault', null)
      .definition.variants.filter(variant => requestNeedsTransaction(variant.request))
      .map(variant => variant.id);
    expect(broadcasting).toEqual(['bitcoin-broadcast', 'stacks-broadcast']);
  });

  it('invents no estimated movements for generic calls without spending limits', () => {
    allVariants
      .filter(({ variant }) => variant.request.isGeneric && variant.request.limits.length === 0)
      .forEach(({ variant }) => expect(variant.request.movements).toEqual([]));
  });

  it('gives generic calls with limits no movement beyond their limits', () => {
    allVariants
      .filter(({ variant }) => variant.request.isGeneric)
      .forEach(({ variant }) => {
        variant.request.movements.forEach(movement => {
          const limit = variant.request.limits.find(
            candidate => candidate.asset === movement.asset
          );
          if (!limit) throw new Error(`No limit for ${movement.asset}`);
          expect(Math.abs(movement.amount)).toBeLessThanOrEqual(limit.amount);
        });
      });
  });

  it('includes three generic contract calls', () => {
    const generic = journeyDefinitions.filter(definition =>
      definition.variants.every(variant => variant.request.isGeneric)
    );
    expect(generic).toHaveLength(3);
  });

  it('charges no fee for messages and connections', () => {
    allVariants
      .filter(({ variant }) => ['connect', 'sign-message'].includes(variant.request.kind))
      .forEach(({ variant }) => expect(variant.request.fee).toBeNull());
  });
});

describe('resolveJourney', () => {
  it('falls back to the first family and variant', () => {
    const resolved = resolveJourney('missing', 'missing');
    expect(resolved.definition.id).toBe('connect');
    expect(resolved.variant.id).toBe('first');
  });

  it('falls back to the first variant of a known family', () => {
    expect(resolveJourney('leather-send', 'doge').variant.id).toBe('btc');
  });
});
