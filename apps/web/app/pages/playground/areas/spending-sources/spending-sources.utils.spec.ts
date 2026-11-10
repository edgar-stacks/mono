import { mixedScenario, taprootAvoidableScenario } from './spending-sources.mock-data';
import { getDefaultAllowed, isRequiredToCover, planSpend } from './spending-sources.utils';

const bothTypes = ['nativeSegwit', 'taproot'] as const;

describe('planSpend', () => {
  it('pools allowed coins largest first until amount plus fee is covered', () => {
    const plan = planSpend({
      sources: mixedScenario.sources,
      allowed: [...bothTypes],
      amountSats: mixedScenario.amountSats,
    });

    expect(plan).toEqual({
      isCovered: true,
      feeSats: 1_335,
      selectedSats: 444_000,
      spentByType: { nativeSegwit: 412_000, taproot: 32_000 },
    });
  });

  it('reports uncovered when the allowed coins fall short', () => {
    const plan = planSpend({
      sources: mixedScenario.sources,
      allowed: ['nativeSegwit'],
      amountSats: mixedScenario.amountSats,
    });

    expect(plan).toEqual({
      isCovered: false,
      feeSats: 1_045,
      selectedSats: 412_000,
      spentByType: { nativeSegwit: 412_000, taproot: 0 },
    });
  });

  it('covers with Native SegWit only when Taproot is left out', () => {
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
      allowed: [...bothTypes],
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
  it('requires both types in the mixed scenario', () => {
    const { sources, amountSats } = mixedScenario;

    expect(isRequiredToCover({ sources, type: 'nativeSegwit', amountSats })).toBe(true);
    expect(isRequiredToCover({ sources, type: 'taproot', amountSats })).toBe(true);
  });

  it('requires only Native SegWit when Taproot is avoidable', () => {
    const { sources, amountSats } = taprootAvoidableScenario;

    expect(isRequiredToCover({ sources, type: 'nativeSegwit', amountSats })).toBe(true);
    expect(isRequiredToCover({ sources, type: 'taproot', amountSats })).toBe(false);
  });
});

describe('getDefaultAllowed', () => {
  it('allows every type when Native SegWit alone cannot cover the transfer', () => {
    const { sources, amountSats } = mixedScenario;

    expect(getDefaultAllowed({ sources, amountSats })).toEqual([...bothTypes]);
  });

  it('keeps Taproot out when Native SegWit alone covers the transfer', () => {
    const { sources, amountSats } = taprootAvoidableScenario;

    expect(getDefaultAllowed({ sources, amountSats })).toEqual(['nativeSegwit']);
  });
});
