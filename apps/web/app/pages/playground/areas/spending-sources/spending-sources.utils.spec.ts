import { describe, expect, it } from 'vitest';

import { mixedScenario, taprootAvoidableScenario } from './spending-sources.mock-data';
import { getDefaultAllowed, isRequiredToCover, planSpend } from './spending-sources.utils';

describe('planSpend', () => {
  it('pools both address types largest first in the mixed scenario', () => {
    const plan = planSpend({
      sources: mixedScenario.sources,
      allowed: ['nativeSegwit', 'taproot'],
      amountSats: mixedScenario.amountSats,
    });

    expect(plan).toEqual({
      isCovered: true,
      feeSats: 1_335,
      selectedSats: 444_000,
      spentByType: { nativeSegwit: 412_000, taproot: 32_000 },
    });
  });

  it('does not cover the mixed scenario with Native SegWit alone', () => {
    const plan = planSpend({
      sources: mixedScenario.sources,
      allowed: ['nativeSegwit'],
      amountSats: mixedScenario.amountSats,
    });

    expect(plan.isCovered).toBe(false);
    expect(plan.selectedSats).toBe(412_000);
    expect(plan.spentByType).toEqual({ nativeSegwit: 412_000, taproot: 0 });
  });

  it('covers the Taproot-avoidable scenario with Native SegWit alone', () => {
    const plan = planSpend({
      sources: taprootAvoidableScenario.sources,
      allowed: ['nativeSegwit'],
      amountSats: taprootAvoidableScenario.amountSats,
    });

    expect(plan).toEqual({
      isCovered: true,
      feeSats: 1_045,
      selectedSats: 500_000,
      spentByType: { nativeSegwit: 500_000, taproot: 0 },
    });
  });

  it('reaches for the largest Taproot coin first when Taproot is allowed', () => {
    const plan = planSpend({
      sources: taprootAvoidableScenario.sources,
      allowed: ['nativeSegwit', 'taproot'],
      amountSats: taprootAvoidableScenario.amountSats,
    });

    expect(plan).toEqual({
      isCovered: true,
      feeSats: 995,
      selectedSats: 650_000,
      spentByType: { nativeSegwit: 300_000, taproot: 350_000 },
    });
  });
});

describe('isRequiredToCover', () => {
  it('requires both address types in the mixed scenario', () => {
    const { sources, amountSats } = mixedScenario;

    expect(isRequiredToCover({ sources, type: 'nativeSegwit', amountSats })).toBe(true);
    expect(isRequiredToCover({ sources, type: 'taproot', amountSats })).toBe(true);
  });

  it('requires only Native SegWit in the Taproot-avoidable scenario', () => {
    const { sources, amountSats } = taprootAvoidableScenario;

    expect(isRequiredToCover({ sources, type: 'nativeSegwit', amountSats })).toBe(true);
    expect(isRequiredToCover({ sources, type: 'taproot', amountSats })).toBe(false);
  });
});

describe('getDefaultAllowed', () => {
  it('allows Taproot when Native SegWit alone cannot cover the transfer', () => {
    const { sources, amountSats } = mixedScenario;

    expect(getDefaultAllowed({ sources, amountSats })).toEqual(['nativeSegwit', 'taproot']);
  });

  it('keeps Taproot out when Native SegWit alone covers the transfer', () => {
    const { sources, amountSats } = taprootAvoidableScenario;

    expect(getDefaultAllowed({ sources, amountSats })).toEqual(['nativeSegwit']);
  });
});
